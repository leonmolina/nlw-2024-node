import { FastifyInstance } from "fastify";
import { prisma } from "@/lib/prisma";
import z from "zod";
import { voting } from "@/utils/voting-pub-sub";

export async function pollResults(app: FastifyInstance) {
  app.get('/polls/:pollId/results', { websocket: true }, async (connection, request) => {
    const getPollParams = z.object({
      pollId: z.string().uuid(),
    });
    const { pollId } = getPollParams.parse(request.params);
  
    // Check for existing poll, if not, destroy the connection
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) return connection.destroy();
  
    voting.subscribe(poll.id, message => {
      connection.socket.send(JSON.stringify(message));
    });
  });
}