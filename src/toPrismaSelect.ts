import {
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  GraphQLResolveInfo,
  Kind,
  ObjectFieldNode,
  SelectionNode,
} from "graphql"

interface ISelection {
  field: string
  selections: ISelection[] | null
  where?: any
}
export type ParsedResult = {
  select: {
    [key: string]: true | ParsedResult
  }
  where?: any
  take?: number
  skip?: number
}
type ParseQueryOptions = { notAllowed?: string[] }
export async function toPrismaSelect(info: GraphQLResolveInfo, options: ParseQueryOptions = {}) {
  const parsed = info.fieldNodes.reduce((prev, cur) => {
    if (cur.selectionSet) {
      return [...prev, ...parseQueryFields(cur, info)]
    }
    return prev
  }, [] as ISelection[])

  const parsedSelection = parseSelections(parsed).select
  if (typeof parsedSelection === "boolean") {
    return {}
  }
  return Object.values(parsedSelection)[0]
}

function parseQueryFields(field: FieldNode | FragmentDefinitionNode, info: GraphQLResolveInfo) {
  const hasIncludeOrSkip = (field: FieldNode | FragmentSpreadNode) => {
    if (field.directives) {
      const include = field.directives.find((a) => a.name.value === "include")
      const skip = field.directives.find((a) => a.name.value === "skip")
      return include || skip
    }
    return false
  }
  const ignoreField = (field: FieldNode | FragmentSpreadNode) => {
    if (field.directives && field.directives[0]) {
      const directive = field.directives[0]

      const name = directive.name.value
      const args = directive.arguments
      if (hasIncludeOrSkip(field)) {
        if (args) {
          const arg = args[0]
          if (arg.value.kind === Kind.VARIABLE) {
            const value = info.variableValues[arg.value.name.value]
            if (name === "skip") {
              if (value) {
                return true
              }
            } else {
              if (name === "include") {
                if (!value) {
                  return true
                }
              }
            }
          }
        }
      }
    }
    return false
  }
  const parse = (field: SelectionNode, prev = [] as any[]) => {
    switch (field.kind) {
      case "Field": {
        if (!ignoreField(field)) {
          let fieldName = field.name.value
          if (fieldName === "__typename") {
            return prev
          }
          field.directives
          const w = getArgument(field, info)
          prev.push({
            field: fieldName,
            selections: field.selectionSet
              ? field.selectionSet.selections.reduce(
                  (acc, node) => [...acc, ...parseQueryFields(node as any, info)],
                  [] as any[],
                )
              : null,
            ...(w || {}),
          })
        }
        break
      }
      case "FragmentSpread":
        {
          if (!ignoreField(field)) {
            const fragment = info.fragments[field.name.value]

            const fields = fragment.selectionSet.selections.reduce(
              (acc, node) => [...acc, ...parseQueryFields(node as any, info)],
              [] as any[],
            )
            prev.push(...fields)
          }
        }
        break

      default:
        break
    }
    return prev
  }
  const { selectionSet } = field
  if (!selectionSet) {
    return parse(field as any)
  }

  const w = getArgument(field, info)

  let selections = selectionSet.selections.reduce((prev, field) => {
    return [...prev, ...parse(field as any)]
  }, [] as ISelection[])

  return [{ selections, where: "where" in w ? w.where : w, field: field.name.value }]
}

function parseSelections(selections: ISelection[]) {
  const parsed: ParsedResult = {
    select: {},
    where: {},
    take: 0,
    skip: 0,
  }
  selections.forEach((selection) => {
    if (selection.selections) {
      const parsedSelections = parseSelections(selection.selections)
      parsed.select[selection.field] = parsedSelections
    } else {
      parsed.select[selection.field] = true
    }
    if (Object.keys(selection.where || {}).length) {
      parsed.select[selection.field] = parsed.select[selection.field] || {}
      // @ts-ignore
      parsed.select[selection.field].where = selection.where
    } else {
      delete parsed.where
    }
    ;["take", "skip"].forEach((key) => {
      switch (key) {
        case "take":
        case "skip":
          if (selection[key]) {
            parsed.select[selection.field] = parsed.select[selection.field] || {}
            // @ts-ignore
            parsed.select[selection.field][key] = +selection[key]
          } else {
            delete parsed[key]
          }
          break
        default:
          break
      }
    })
  })
  return parsed
}
function getArgument(field: FieldNode | FragmentDefinitionNode, info: GraphQLResolveInfo) {
  let w: any = {}
  if ("arguments" in field) {
    field.arguments?.forEach((arg) => {
      const name = arg.name.value

      switch (arg.value.kind) {
        case Kind.OBJECT:
          let v = parseArguments(arg.value.fields, info)
          w[name] = getObjectValue(v)
          break
        case Kind.VARIABLE:
          const value = info.variableValues[arg.value.name.value]
          if (value) {
            w[name] = value
          }
          break
        case Kind.ENUM:
          w[name] = arg.value.value
          break
        case Kind.NULL:
          w[name] = null
          break
        default:
          // @ts-ignore
          w[name] = arg.value.value
          break
      }
    })
  }
  return w
}
function parseArguments(fields: readonly ObjectFieldNode[], info: GraphQLResolveInfo) {
  return fields.reduce((prev, cur) => {
    if (cur.kind === Kind.OBJECT_FIELD) {
      switch (cur.value.kind) {
        case Kind.VARIABLE:
          prev[cur.name.value] = info.variableValues[cur.value.name.value]
          break
        case Kind.LIST:
          prev[cur.name.value] = cur.value.values.map((v) => {
            if (v.kind === Kind.OBJECT) {
              return parseArguments(v.fields, info)
            }
            return v
          })
          break
        case Kind.OBJECT:
          prev[cur.name.value] = parseArguments(cur.value.fields, info)
          break
        default:
          prev[cur.name.value] = cur.value
          break
      }
    } else {
      prev[cur.name.value] = cur.value
    }
    return prev
  }, {})
}

// map through an object recursively and check if any of it's properties value is not an ObjectValueNode and if so, return the key with the name value
function getObjectValue(obj: any) {
  let newObj: any = {}
  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object") {
        if (value && "kind" in value) {
          // @ts-ignore
          newObj[key] = value.value
        } else {
          newObj[key] = getObjectValue(value)
        }
      } else newObj[key] = value
    }
  }
  return newObj
}
