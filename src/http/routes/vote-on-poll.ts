import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { redis } from "../../lib/redis";
import { voting } from "../../utils/voting-pub-sub";
// TODO: Add absolute import paths

export async function voteOnPoll(app: FastifyInstance) {
  app.post('/polls/:pollId/votes', async (request, reply) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid(),
    });
    const voteOnPollParams= z.object({
      pollId: z.string().uuid(),
    });
  
    const { pollOptionId } = voteOnPollBody.parse(request.body);
    const { pollId } = voteOnPollParams.parse(request.params);

    let { sessionId } = request.cookies;

    // Check if pollId exists
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true }
    });

    if (!poll) {
      return reply.status(400).send({ message: 'Poll not found.' });
    }

    // Check if pollOptionId exists on poll
    const pollOption = poll.options.find(option => option.id === pollOptionId);
    if (!pollOption) {
      return reply.status(400).send({ message: 'Poll option not found.' });
    }

    if (sessionId) {
      const userPreviousVoteOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId: poll.id,
          }
        }
      })

      if (userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionId !== pollOption.id) {
        await prisma.vote.delete({ where: { id: userPreviousVoteOnPoll.id } });
        const votes = await redis.zincrby(poll.id, -1, userPreviousVoteOnPoll.pollOptionId);
        voting.publish(poll.id, {
          pollOptionId: userPreviousVoteOnPoll.pollOptionId,
          votes: Number(votes),
        });
      } else if (userPreviousVoteOnPoll) {
        return reply.status(400).send({ message: "You've already made this exact vote." })
      }
    }

    if (!sessionId) {
      sessionId = randomUUID();
  
      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        signed: true,
        httpOnly: true,
      });
    }

    await prisma.vote.create({
      data: {
        sessionId,
        pollId: poll.id,
        pollOptionId: pollOption.id,
      }
    });

    const votes = await redis.zincrby(poll.id, 1, pollOption.id);

    voting.publish(poll.id, {
      pollOptionId: pollOption.id,
      votes: Number(votes),
    });

    return reply.status(201).send();
  });
}