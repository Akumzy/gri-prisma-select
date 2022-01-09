import { parse } from "graphql"
import { toPrismaSelect } from "./toPrismaSelect"

describe("Transform", () => {
  it("a GraphQL resolve info to Prisma select object", async () => {
    // graphql query string
    const query = /* GraphQL */ `
      query posts {
        id
        createdAt
        updatedAt
        content

        author {
          id
          name
        }
        comments {
          id
          content
          author {
            id

            name
          }
        }
      }
    `
    const prismaSelect = {
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        content: true,
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }
    // Remember info should be a GraphQL resolve info
    const info = parse(query, { noLocation: true })
    let mock = {
      // @ts-ignore
      ...info,
      fieldNodes: info.definitions,
    }
    const result = await toPrismaSelect(mock as any)

    expect(result).toStrictEqual(prismaSelect)
  })
})
