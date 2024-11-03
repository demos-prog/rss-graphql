import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import { UUIDType } from './types/uuid.js';
import { MemberTypeId } from '../member-types/schemas.js';
import { PrismaClient } from '@prisma/client';
import { userLoader } from './loaders/userLoader.js';

const CreateUserInput = new GraphQLInputObjectType({
  name: 'CreateUserInput',
  fields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
  },
});

const ChangeUserInput = new GraphQLInputObjectType({
  name: 'ChangeUserInput',
  fields: {
    name: { type: GraphQLString },
    balance: { type: GraphQLFloat },
  },
});

const CreatePostInput = new GraphQLInputObjectType({
  name: 'CreatePostInput',
  fields: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    authorId: { type: new GraphQLNonNull(UUIDType) },
  },
});

const MemberTypeIdType = new GraphQLEnumType({
  name: 'MemberTypeId',
  values: {
    BASIC: { value: MemberTypeId.BASIC },
    BUSINESS: { value: MemberTypeId.BUSINESS },
  },
});

const ChangePostInput = new GraphQLInputObjectType({
  name: 'ChangePostInput',
  fields: {
    title: { type: GraphQLString },
    content: { type: GraphQLString },
  },
});

const CreateProfileInput = new GraphQLInputObjectType({
  name: 'CreateProfileInput',
  fields: {
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    memberTypeId: { type: new GraphQLNonNull(MemberTypeIdType) },
    userId: { type: new GraphQLNonNull(UUIDType) },
  },
});

const ChangeProfileInput = new GraphQLInputObjectType({
  name: 'ChangeProfileInput',
  fields: {
    isMale: { type: GraphQLBoolean },
    yearOfBirth: { type: GraphQLInt },
    memberTypeId: { type: MemberTypeIdType },
  },
});

const Post = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    author: {
      type: User,
      resolve: async (
        post: { authorId: string },
        args,
        ctx: { prisma: PrismaClient },
      ) => {
        return await ctx.prisma.user.findUnique({
          where: { id: post.authorId },
        });
      },
    },
    authorId: { type: new GraphQLNonNull(UUIDType) },
  }),
});

const MemberType = new GraphQLObjectType({
  name: 'MemberType',
  fields: () => ({
    id: { type: new GraphQLNonNull(MemberTypeIdType) },
    discount: { type: new GraphQLNonNull(GraphQLFloat) },
    postsLimitPerMonth: { type: new GraphQLNonNull(GraphQLInt) },
  }),
});

const Profile = new GraphQLObjectType({
  name: 'Profile',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    userId: { type: new GraphQLNonNull(UUIDType) },
    memberType: {
      type: MemberType,
      resolve: async (
        profile: { memberTypeId: MemberTypeId; userId: string },
        args,
        ctx: { prisma: PrismaClient },
      ) => {
        return await ctx.prisma.memberType.findUnique({
          where: { id: profile.memberTypeId },
        });
      },
    },
    memberTypeId: { type: MemberTypeIdType },
  }),
});

const PrismaStats = new GraphQLObjectType({
  name: 'PrismaStats',
  fields: {
    model: { type: new GraphQLNonNull(GraphQLString) },
    operation: { type: new GraphQLNonNull(GraphQLString) },
    args: { type: GraphQLString },
  },
});

const User: GraphQLObjectType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
    profile: {
      type: Profile,
      resolve: async (user: { id: string }, args, ctx: { prisma: PrismaClient }) => {
        return await ctx.prisma.profile.findUnique({
          where: { userId: user.id },
        });
      },
    },
    posts: {
      type: new GraphQLNonNull(new GraphQLList(Post)),
      resolve: async (user: { id: string }, args, ctx: { prisma: PrismaClient }) => {
        return await ctx.prisma.post.findMany({
          where: { authorId: user.id },
        });
      },
    },
    userSubscribedTo: {
      type: new GraphQLList(User),
      resolve: async (user: { id: string }, args, ctx: { prisma: PrismaClient }) => {
        const subscribedTo = await ctx.prisma.user.findMany({
          where: {
            subscribedToUser: {
              some: {
                subscriberId: user.id,
              },
            },
          },
          include: {
            subscribedToUser: true,
          },
        });

        return subscribedTo;
      },
    },
    subscribedToUser: {
      type: new GraphQLList(User),
      resolve: async (user: { id: string }, args, ctx: { prisma: PrismaClient }) => {
        const subscribedToUser = await ctx.prisma.user.findMany({
          where: {
            userSubscribedTo: {
              some: {
                authorId: user.id,
              },
            },
          },
          include: {
            userSubscribedTo: true,
          },
        });

        return subscribedToUser;
      },
    },
  }),
});

const RootQueryType = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: () => ({
    memberTypes: {
      type: new GraphQLList(MemberType),
      resolve: (_, __, { prisma }: { prisma: PrismaClient }) => {
        return prisma.memberType.findMany();
      },
    },

    memberType: {
      type: MemberType,
      args: { id: { type: new GraphQLNonNull(MemberTypeIdType) } },
      resolve: (_, { id }, ctx) => {
        return ctx.prisma.memberType.findUnique({ where: { id: id as MemberTypeId } });
      },
    },

    prismaStats: {
      type: new GraphQLList(PrismaStats),
      resolve: (_, __, ctx) => {
        return ctx.prisma.$queryRaw`SELECT * FROM PrismaStats`;
      },
    },

    users: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
      resolve: (_, __, ctx) => {
        return ctx.prisma.user.findMany();
      },
    },

    user: {
      type: User,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_, { id }, ctx) => {
        return await userLoader(ctx.prisma).load(id as string);
      },
    },

    posts: {
      type: new GraphQLList(Post),
      resolve: (_, __, ctx) => {
        return ctx.prisma.post.findMany();
      },
    },

    post: {
      type: Post,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: (_, { id }, ctx) => {
        return ctx.prisma.post.findUnique({ where: { id: id as string } });
      },
    },

    profiles: {
      type: new GraphQLList(Profile),
      resolve: (_, __, ctx) => {
        return ctx.prisma.profile.findMany();
      },
    },

    profile: {
      type: Profile,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: (_, { id }, ctx) => {
        return ctx.prisma.profile.findUnique({ where: { id: id as string } });
      },
    },
  }),
});

const Mutations = new GraphQLObjectType({
  name: 'Mutations',
  fields: {
    createUser: {
      type: new GraphQLNonNull(User),
      args: { dto: { type: new GraphQLNonNull(CreateUserInput) } },
      resolve: async (
        _,
        { dto }: { dto: { name: string; balance: number } },
        { prisma }: { prisma: PrismaClient },
      ) => {
        return prisma.user.create({ data: dto });
      },
    },
    createPost: {
      type: Post,
      args: { dto: { type: new GraphQLNonNull(CreatePostInput) } },
      resolve: async (
        _,
        {
          dto,
        }: {
          dto: { title: string; content: string; authorId: string };
        },
        { prisma }: { prisma: PrismaClient },
      ) => {
        return await prisma.post.create({ data: { ...dto } });
      },
    },
    changePost: {
      type: Post,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: new GraphQLNonNull(ChangePostInput) },
      },
      resolve: async (
        _,
        { id, dto }: { id: string; dto: { title?: string; content?: string } },
        { prisma }: { prisma: PrismaClient },
      ) => {
        return await prisma.post.update({ where: { id }, data: { ...dto } });
      },
    },
    createProfile: {
      type: Profile,
      args: { dto: { type: new GraphQLNonNull(CreateProfileInput) } },
      resolve: async (
        _,
        {
          dto,
        }: {
          dto: {
            isMale: boolean;
            yearOfBirth: number;
            memberTypeId: MemberTypeId;
            userId: string;
          };
        },
        { prisma }: { prisma: PrismaClient },
      ) => {
        return await prisma.profile.create({ data: dto });
      },
    },
    changeProfile: {
      type: Profile,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: new GraphQLNonNull(ChangeProfileInput) },
      },
      resolve: async (
        _,
        {
          id,
          dto,
        }: {
          id: string;
          dto: { isMale?: boolean; yearOfBirth?: number; memberTypeId?: MemberTypeId };
        },
        { prisma }: { prisma: PrismaClient },
      ) => {
        return await prisma.profile.update({ where: { id }, data: { ...dto } });
      },
    },
    changeUser: {
      type: User,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: new GraphQLNonNull(ChangeUserInput) },
      },
      resolve: async (
        _,
        { id, dto }: { id: string; dto: { name?: string; balance?: number } },
        { prisma }: { prisma: PrismaClient },
      ) => {
        return await prisma.user.update({ where: { id }, data: { ...dto } });
      },
    },
    deleteUser: {
      type: GraphQLString,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (
        _,
        { id }: { id: string },
        { prisma }: { prisma: PrismaClient },
      ): Promise<string> => {
        await prisma.user.delete({ where: { id } });
        return 'User deleted';
      },
    },
    deletePost: {
      type: GraphQLString,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (
        _,
        { id }: { id: string },
        { prisma }: { prisma: PrismaClient },
      ): Promise<string> => {
        await prisma.post.delete({ where: { id } });
        return 'Post deleted';
      },
    },
    deleteProfile: {
      type: GraphQLString,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (
        _,
        { id }: { id: string },
        { prisma }: { prisma: PrismaClient },
      ): Promise<string> => {
        await prisma.profile.delete({ where: { id } });
        return 'Profile deleted';
      },
    },
    subscribeTo: {
      type: GraphQLString,
      args: {
        userId: { type: new GraphQLNonNull(UUIDType) },
        authorId: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (
        _,
        { userId, authorId }: { userId: string; authorId: string },
        { prisma }: { prisma: PrismaClient },
      ) => {
        await prisma.user.update({
          where: { id: userId },
          data: { userSubscribedTo: { create: { authorId } } },
        });
        return authorId;
      },
    },
    unsubscribeFrom: {
      type: GraphQLString,
      args: {
        userId: { type: new GraphQLNonNull(UUIDType) },
        authorId: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (
        _,
        { userId, authorId }: { userId: string; authorId: string },
        { prisma }: { prisma: PrismaClient },
      ): Promise<string> => {
        await prisma.user.update({
          where: { id: userId },
          data: { userSubscribedTo: { deleteMany: { authorId } } },
        });
        return authorId;
      },
    },
  },
});

const schema = new GraphQLSchema({
  query: RootQueryType,
  mutation: Mutations,
});

export default schema;
