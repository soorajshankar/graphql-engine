import { terminateSql } from './sqlUtils';
import { TableInfo, FkOptions } from '../../Services/Data/Types';
import { Mapping } from '../../Services/Data/DataActions';

export const getRunSqlQuery = (
  sql: string,
  shouldCascade: boolean,
  readOnly: boolean
) => {
  return {
    type: 'run_sql',
    args: {
      sql: terminateSql(sql),
      cascade: !!shouldCascade,
      read_only: !!readOnly,
    },
  };
};

export const getCreatePermissionQuery = (
  action: string,
  tableDef: TableInfo,
  role: string,
  permission: string
) => {
  return {
    type: 'create_' + action + '_permission',
    args: {
      table: tableDef,
      role,
      permission,
    },
  };
};

export const getDropPermissionQuery = (
  action: string,
  tableDef: TableInfo,
  role: string
) => {
  return {
    type: 'drop_' + action + '_permission',
    args: {
      table: tableDef,
      role,
    },
  };
};

export const generateSetCustomTypesQuery = (customTypes: object[]) => {
  return {
    type: 'set_custom_types',
    args: customTypes,
  };
};

export const generateCreateActionQuery = (
  name: string,
  definition: string,
  comment: string
) => {
  return {
    type: 'create_action',
    args: {
      name,
      definition,
      comment,
    },
  };
};

export const generateDropActionQuery = (name: string) => {
  return {
    type: 'drop_action',
    args: {
      name,
    },
  };
};

export const getFetchActionsQuery = () => {
  return {
    type: 'select',
    args: {
      table: {
        name: 'hdb_action',
        schema: 'hdb_catalog',
      },
      columns: ['*.*'],
      order_by: [{ column: 'action_name', type: 'asc' }],
    },
  };
};

export const getFetchCustomTypesQuery = () => {
  return {
    type: 'select',
    args: {
      table: {
        name: 'hdb_custom_types',
        schema: 'hdb_catalog',
      },
      columns: ['*.*'],
    },
  };
};

export const getSetCustomRootFieldsQuery = (
  tableDef: TableInfo,
  rootFields: Record<string, any>,
  customColumnNames: Record<string, any>
) => {
  return {
    type: 'set_table_custom_fields',
    version: 2,
    args: {
      table: tableDef,
      custom_root_fields: rootFields,
      custom_column_names: customColumnNames,
    },
  };
};

export const getFetchAllRolesQuery = () => ({
  type: 'select',
  args: {
    table: {
      schema: 'hdb_catalog',
      name: 'hdb_role',
    },
    columns: ['role_name'],
    order_by: { column: 'role_name', type: 'asc' },
  },
});

export const getCreateActionPermissionQuery = (
  def: { role: string; filter: any },
  actionName: string
) => {
  console.log({ def });
  return {
    type: 'create_action_permission',
    args: {
      action: actionName,
      role: def.role,
      definition: {
        select: {
          filter: def.filter,
        },
      },
    },
  };
};

export const getUpdateActionQuery = (
  def: string,
  actionName: string,
  actionComment: string
) => {
  return {
    type: 'update_action',
    args: {
      name: actionName,
      definition: def,
      comment: actionComment,
    },
  };
};

export const getDropActionPermissionQuery = (
  role: string,
  actionName: string
) => {
  return {
    type: 'drop_action_permission',
    args: {
      action: actionName,
      role,
    },
  };
};

export const getSetTableEnumQuery = (tableDef: TableInfo, isEnum: boolean) => {
  return {
    type: 'set_table_is_enum',
    args: {
      table: tableDef,
      is_enum: isEnum,
    },
  };
};

export const getTrackTableQuery = (tableDef: TableInfo) => {
  return {
    type: 'add_existing_table_or_view',
    args: tableDef,
  };
};

export const getUntrackTableQuery = (tableDef: TableInfo) => {
  return {
    type: 'untrack_table',
    args: {
      table: tableDef,
    },
  };
};

export const getAddComputedFieldQuery = (
  tableDef: TableInfo,
  computedFieldName: string,
  definition: object,
  comment: string
) => {
  return {
    type: 'add_computed_field',
    args: {
      table: tableDef,
      name: computedFieldName,
      definition: {
        ...definition,
      },
      comment,
    },
  };
};

export const getDropComputedFieldQuery = (
  tableDef: TableInfo,
  computedFieldName: string
) => {
  return {
    type: 'drop_computed_field',
    args: {
      table: tableDef,
      name: computedFieldName,
    },
  };
};

export const getDeleteQuery = (
  pkClause: object,
  tableName: string,
  schemaName: string
) => {
  return {
    type: 'delete',
    args: {
      table: {
        name: tableName,
        schema: schemaName,
      },
      where: pkClause,
    },
  };
};

export const getBulkDeleteQuery = (
  pkClauses: object[],
  tableName: string,
  schemaName: string
) => pkClauses.map(pkClause => getDeleteQuery(pkClause, tableName, schemaName));

export const getEnumOptionsQuery = (
  request: { enumTableName: string; enumColumnName: string },
  currentSchema: string
) => {
  return {
    type: 'select',
    args: {
      table: {
        name: request.enumTableName,
        schema: currentSchema,
      },
      columns: [request.enumColumnName],
    },
  };
};

export const inconsistentObjectsQuery = {
  type: 'get_inconsistent_metadata',
  args: {},
};

export const dropInconsistentObjectsQuery = {
  type: 'drop_inconsistent_metadata',
  args: {},
};

export const getReloadMetadataQuery = (shouldReloadRemoteSchemas: boolean) => ({
  type: 'reload_metadata',
  args: {
    reload_remote_schemas: shouldReloadRemoteSchemas,
  },
});

export const getReloadRemoteSchemaCacheQuery = (remoteSchemaName: string) => {
  return {
    type: 'reload_remote_schema',
    args: {
      name: remoteSchemaName,
    },
  };
};

export const exportMetadataQuery = {
  type: 'export_metadata',
  args: {},
};

export const generateReplaceMetadataQuery = (metadataJson: any) => ({
  type: 'replace_metadata',
  args: metadataJson,
});

export const resetMetadataQuery = {
  type: 'clear_metadata',
  args: {},
};

export const getFilterByDisplayNameQuery = (
  searchValue: string,
  currentSchema: string,
  fkOpts: FkOptions
) => ({
  type: 'select',
  args: {
    table: {
      name: fkOpts.refTable,
      schema: currentSchema,
    },
    columns: [fkOpts.to, fkOpts.displayName],
    ...(searchValue !== ''
      ? {
          where: {
            [fkOpts.displayName]: { $ilike: `%${searchValue}%` },
          },
        }
      : {}),
    limit: 20,
  },
});

export const getLoadConsoleOptsQuery = () => ({
  type: 'select',
  args: {
    table: {
      name: 'hdb_version',
      schema: 'hdb_catalog',
    },
    columns: ['hasura_uuid', 'console_state'],
  },
});

export const getForeignKeyOptionsQuery = (
  m: Mapping,
  currentSchema: string
) => ({
  type: 'select',
  args: {
    table: {
      name: m.refTableName,
      schema: currentSchema,
    },
    columns: [m.displayColumnName, m.refColumnName],
    limit: 20,
  },
});

export const generateSelectQuery = (
  type: string,
  tableDef: { tableName: string; schemaName: string },
  {
    where,
    limit,
    offset,
    order_by,
    columns,
  }: {
    where: object;
    limit?: number;
    offset?: number;
    order_by?: 'asc' | 'desc';
    columns: string[];
  }
) => ({
  type,
  args: {
    columns,
    where,
    limit,
    offset,
    order_by,
    table: tableDef,
  },
});

export const getFetchManualTriggersQuery = (tableName: string) => ({
  type: 'select',
  args: {
    table: {
      name: 'event_triggers',
      schema: 'hdb_catalog',
    },
    columns: ['*'],
    order_by: {
      column: 'name',
      type: 'asc',
      nulls: 'last',
    },
    where: {
      table_name: tableName,
    },
  },
});
