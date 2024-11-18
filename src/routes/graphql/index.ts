import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { graphql, validate, parse } from 'graphql';
import schema from './schema.js';
import depthLimit from 'graphql-depth-limit';
import { userLoader } from './loaders/userLoader.js';
import { Context } from 'node:vm';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(req) {
      const query = req.body.query;
      const variables = req.body.variables;
      try {
        const parsedQuery = parse(query);
        const errs = validate(schema, parsedQuery, [depthLimit(5)]);
        if (errs.length > 0) {
          return { errors: errs, prisma };
        }

        const loadUsers = userLoader(prisma);

        const contextValue: Context = {
          prisma,
          loadUsers,
        };

        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
          contextValue,
        });

        if (result.errors) {
          return { errors: result.errors, prisma };
        }

        return result;
      } catch (error) {
        return { errors: [{ message: 'Internal server error' }], prisma };
      }
    },
  });
};

export default plugin;
