import { GraphQLResolveInfo, SelectionSetNode } from "graphql"

interface ISelection {
  field: string
  selections: ISelection[] | null
}
export type ParsedResult = {
  select: {
    [key: string]: true | ParsedResult
  }
}
type ParseQueryOptions = { notAllowed?: string[] }

function parseQueryFields(node: SelectionSetNode, info: GraphQLResolveInfo) {
  if (!node.selections) {
    return []
  }
  return node.selections.reduce((prev, field) => {
    switch (field.kind) {
      case "Field": {
        let fieldName = field.name.value
        prev.push({
          field: fieldName,
          selections: field.selectionSet ? parseQueryFields(field.selectionSet, info) : null,
        })
        break
      }
      case "FragmentSpread": {
        const fragment = info.fragments[field.name.value]
        const fields = parseQueryFields(fragment.selectionSet, info)
        prev.push(...fields)
        break
      }
      default:
        break
    }

    return prev
  }, [] as ISelection[])
}

function serialize(sels: ISelection[]) {
  return sels.reduce(
    (obj, v) => {
      if (v.selections) {
        obj.select[v.field] = serialize(v.selections)
      } else {
        if (v.field !== "__typename") {
          obj.select[v.field] = true
        }
      }
      return obj
    },
    {
      select: {},
    } as ParsedResult,
  )
}

export async function toPrismaSelect(info: GraphQLResolveInfo, options: ParseQueryOptions = {}) {
  const parsed = info.fieldNodes.reduce((prev, cur) => {
    const { selectionSet } = cur
    if (selectionSet) {
      return [...prev, ...parseQueryFields(selectionSet, info)]
    }
    return prev
  }, [] as ISelection[])

  return serialize(parsed)
}
