import { mapSchema, getDirective, MapperKind } from "@graphql-tools/utils"
import type { GraphQLSchema } from "graphql/type"
import { toPrismaSelect } from "./toPrismaSelect"

export function toPrismaSelectDirectiveTransformer(schema: GraphQLSchema, directiveName: string) {
  return mapSchema(schema, {
    // Executes once for each object field definition in the schema
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const directive = getDirective(schema, fieldConfig, directiveName)?.[0]
      if (directive) {
        const { resolve } = fieldConfig

        fieldConfig.resolve = async function (source, arg, ctx, info) {
          const prismaSelect = await toPrismaSelect(info)
          ctx = { ...ctx, prismaSelect }
          return resolve?.apply(this, [source, arg, ctx, info])
        }
      }
      return fieldConfig
    },
  })
}
