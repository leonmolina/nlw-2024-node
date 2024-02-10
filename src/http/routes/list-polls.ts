import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FastifyInstance } from "fastify";

export async function listPolls(app: FastifyInstance) {
  app.get('/polls', async (request, reply) => {
  
    const polls = await prisma.poll.findMany({
      include: {
        options: {
          select: {
            id: true,
            title: true,
          }
        }
      },
    });

    return reply.send(polls);
  });
}