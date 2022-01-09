import { parse } from "graphql"
import { toPrismaSelect } from "./src/toPrismaSelect"
async function main() {
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
  const info = parse(query, { noLocation: true })
  let v = {
    // @ts-ignore
    ...info,
    fieldNodes: info.definitions,
  }
  const result = await toPrismaSelect(v as any)
  console.log(JSON.stringify(result, null, " "))
  console.log(JSON.stringify(result))
  //@ts-ignore
  console.log(info)
}
main()
