# gri-prisma-select

## Generate **Prisma** select object from **GraphQL** Resolve Info

**GraphQL** Resolve Info is a data structure that contains information about the execution of a GraphQL query,
with this information you can generate **Prisma** select object which extends the benefits GraphQL provides to
clients to your database by only fetching the fields that are needed and as well resolving the
**GraphQL** n+1 query problem with the power of **Prisma**.

## Installation

```shell
# with npm
npm install @akumzy/gri-prisma-select
# with yarn
yarn add @akumzy/gri-prisma-select
# with pnpm
pnpm add @akumzy/gri-prisma-select
```

## Usage

This can be used in two ways:

- As a **GraphQL** directive
- As a function in your **GraphQL** resolver

### Using **GraphQL** directive:

Add directive to your GraphQL schema

```graphql
directive @toPrismaSelect on FIELD_DEFINITION
...
```

Register directive

```ts
import { toPrismaSelectDirectiveTransformer } from "@akumzy/gri-prisma-select"

let schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})
schema = toPrismaSelectDirectiveTransformer(schema, "toPrismaSelect")
```

and use the directive in your GraphQL schema to indicate which query you want to generate a **Prisma** select object for.
e.g.

```graphql
directive @toPrismaSelect on FIELD_DEFINITION
type Query {
  posts: [Post!]! @toPrismaSelect
}
```

and by doing so a property called `prismaSelect` will be added to your resolver context

```ts
async function posts(parent, args, context, info) {
  const prismaSelect = context.prismaSelect
  return await context.prisma.posts.findMany({
    where: {},
    ...prismaSelect,
  })
}
```

### Using in your **GraphQL** resolver:

All you need to do is to pass the **GraphQL** resolve info to the function and it will return a **Prisma** select object.

```ts
import { toPrismaSelect } from "@akumzy/gri-prisma-select"

async function posts(parent, args, context, info) {
  const prismaSelect = toPrismaSelect(info)
  return await context.prisma.posts.findMany({
    where: {},
    ...prismaSelect,
  })
}
```

## Notes

For this package to work as expected you need to make sure that your GraphQL schema has same field names as your Prisma model.
Also note that you have given absolute power to your client to fetch any field that is available in GraphQL schema and exists in your Prisma model as well,
so be careful not to expose any sensitive information fields in your GraphQL schema.

Another issue you'll face will be unkown type for your Prisma return value.

# License

mit
