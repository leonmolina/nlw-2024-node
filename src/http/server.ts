import fastify from 'fastify';
import websocket from '@fastify/websocket';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { createPoll } from '@/http/routes/create-poll';
import { getPoll } from '@/http/routes/get-poll';
import { voteOnPoll } from '@/http/routes/vote-on-poll';
import { pollResults } from '@/http/ws/poll-results';
import { listPolls } from '@/http/routes/list-polls';

const app = fastify();

app.register(cookie, {
  secret: "polls-app-leonm-nlw",
  hook: 'onRequest',
});

app.register(cors)

app.register(websocket);

app.register(createPoll);
app.register(getPoll);
app.register(voteOnPoll);
app.register(pollResults);
app.register(listPolls);

app.listen({ port: 3333 }).then(() => {
  console.log('HTTP server is running on port 3333.')
});