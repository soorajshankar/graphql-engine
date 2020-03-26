import {
  READ_ONLY_RUN_SQL_QUERIES,
  checkFeatureSupport,
} from '../../../helpers/versionUtils';
import { getRunSqlQuery } from '../../Common/utils/v1QueryUtils';
import {
  Schema,
  AllSchemas,
  Relationship,
  ManulaRelationshipDef,
  TableInfo,
  SchemaPermission,
  ForeignKeyConstraint,
  ForeignKey,
  DisplayConfig,
  ConsoleOpts,
  Mappings,
} from './Types';
import { equalTableDefs } from '../../Common/utils/pgUtils';

export const INTEGER = 'integer';
export const SERIAL = 'serial';
export const BIGINT = 'bigint';
export const BIGSERIAL = 'bigserial';
export const UUID = 'uuid';
export const JSONDTYPE = 'json';
export const JSONB = 'jsonb';
export const TIMESTAMP = 'timestamp with time zone';
export const TIME = 'time with time zone';
export const NUMERIC = 'numeric';
export const DATE = 'date';
export const TIMETZ = 'timetz';
export const BOOLEAN = 'boolean';
export const TEXT = 'text';

export const getPlaceholder = (type: string) => {
  switch (type) {
    case TIMESTAMP:
      return new Date().toISOString();
    case DATE:
      return new Date().toISOString().slice(0, 10);
    case TIME:
      const time = new Date().toISOString().slice(11, 19);
      return `${time}Z or ${time}+05:30`;
    case JSONDTYPE:
      return '{"name": "foo"} or [12, "bar"]';
    case JSONB:
      return '{"name": "foo"} or [12, "bar"]';
    case BOOLEAN:
      return '';
    default:
      return type;
  }
};

export const tabNameMap = {
  browse: 'Browse Rows',
  insert: 'Insert Row',
  edit: 'Edit Row',
  modify: 'Modify',
  relationships: 'Relationships',
  permissions: 'Permissions',
};

export const ordinalColSort = (
  a: { ordinal_position: number },
  b: { ordinal_position: number }
) => {
  if (a.ordinal_position < b.ordinal_position) {
    return -1;
  }
  if (a.ordinal_position > b.ordinal_position) {
    return 1;
  }
  return 0;
};

const findFKConstraint = (curTable: Schema, column: any[]) => {
  const fkConstraints = curTable.foreign_key_constraints;
  return fkConstraints.find(
    fk =>
      Object.keys(fk.column_mapping).length === column.length &&
      Object.keys(fk.column_mapping).join(',') === column.join(',')
  );
};

const findOppFKConstraint = (curTable: Schema, column: string[]) => {
  const fkConstraints = curTable.opp_foreign_key_constraints;
  return fkConstraints.find(
    fk =>
      Object.keys(fk.column_mapping).length === column.length &&
      Object.keys(fk.column_mapping).join(',') === column.join(',')
  );
};

export const findTableFromRel = (
  schemas: AllSchemas,
  curTable: Schema,
  rel: Relationship
) => {
  let rTable:
    | null
    | string
    | ManulaRelationshipDef['manual_configuration']['remote_table'] = null;
  let rSchema = 'public';

  // for view
  if (
    'manual_configuration' in rel.rel_def &&
    rel.rel_def.manual_configuration !== undefined
  ) {
    rTable = rel.rel_def.manual_configuration.remote_table;
    if (rTable.schema) {
      rSchema = rTable.schema;
      rTable = rTable.name;
    }
  }

  // for table
  if (
    'foreign_key_constraint_on' in rel.rel_def &&
    rel.rel_def.foreign_key_constraint_on !== undefined
  ) {
    // for object relationship
    if (rel.rel_type === 'object') {
      const column = [rel.rel_def.foreign_key_constraint_on];
      const fkc = findFKConstraint(curTable, column);
      if (fkc) {
        rTable = fkc.ref_table;
        rSchema = fkc.ref_table_table_schema;
      }
    }

    // for array relationship
    if (rel.rel_type === 'array') {
      rTable = rel.rel_def.foreign_key_constraint_on.table;
      if (rTable.schema) {
        rSchema = rTable.schema;
        rTable = rTable.name;
      }
    }
  }
  return schemas.find(
    x => x.table_name === rTable && x.table_schema === rSchema
  );
};

export const findAllFromRel = (
  _schemas: AllSchemas,
  curTable: Schema,
  rel: Relationship
) => {
  const relName = rel.rel_name;
  const lTable = rel.table_name;
  const lSchema = rel.table_schema;
  const isObjRel = rel.rel_type === 'object';
  let lcol: any[] | null = null;
  let rcol = null;
  let rTable = null;
  let rSchema = null;

  // for view
  if (
    'manual_configuration' in rel.rel_def &&
    rel.rel_def.manual_configuration !== undefined
  ) {
    const rTableConfig = rel.rel_def.manual_configuration.remote_table;
    if (rTableConfig.schema) {
      rTable = rTableConfig.name;
      rSchema = rTableConfig.schema;
    } else {
      rTable = rTableConfig;
      rSchema = 'public';
    }
    const columnMapping = rel.rel_def.manual_configuration.column_mapping;
    lcol = Object.keys(columnMapping);
    rcol = lcol.map(column => columnMapping[column]);
  }

  // for table
  if (
    'foreign_key_constraint_on' in rel.rel_def &&
    rel.rel_def.foreign_key_constraint_on !== undefined
  ) {
    // for object relationship
    const foreignKeyConstraintOn = rel.rel_def.foreign_key_constraint_on;
    if (rel.rel_type === 'object') {
      lcol = [foreignKeyConstraintOn];
      const fkc = findFKConstraint(curTable, lcol);
      if (fkc) {
        rTable = fkc.ref_table;
        rSchema = fkc.ref_table_table_schema;
        rcol = [fkc.column_mapping[lcol[0]]]; // todo: test this
      }
    }

    // for array relationship
    if (rel.rel_type === 'array') {
      rcol = [foreignKeyConstraintOn.column];
      const rTableConfig = foreignKeyConstraintOn.table;
      if (rTableConfig.schema) {
        rTable = rTableConfig.name;
        rSchema = rTableConfig.schema;
      } else {
        rTable = rTableConfig;
        rSchema = 'public';
      }
      const rfkc = findOppFKConstraint(curTable, rcol);
      lcol = [rfkc!.column_mapping[rcol[0]]]; // todo: test this
    }
  }
  return {
    relName,
    lTable,
    lSchema,
    isObjRel,
    lcol,
    rcol,
    rTable,
    rSchema,
  };
};

export const getIngForm = (string: string) => {
  return (
    (string[string.length - 1] === 'e'
      ? string.slice(0, string.length - 1)
      : string) + 'ing'
  );
};

export const getEdForm = (string: string) => {
  return (
    (string[string.length - 1] === 'e'
      ? string.slice(0, string.length - 1)
      : string) + 'ed'
  );
};

export const escapeRegExp = (string: string) => {
  return string.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
};

export const getTableName = (t: { name?: string } | string) => {
  if (typeof t === 'string') {
    return t;
  } else if (typeof t === 'object') {
    return 'name' in t ? t.name : '';
  }
  return '';
};

type Options = {
  tables: TableInfo[];
  schemas: AllSchemas;
};

export const fetchTrackedTableListQuery = (options: Options) => {
  const query: Record<string, any> = {
    type: 'select',
    args: {
      table: {
        name: 'hdb_table',
        schema: 'hdb_catalog',
      },
      columns: [
        'table_schema',
        'table_name',
        'is_enum',
        'configuration',
        {
          name: 'primary_key',
          columns: ['*'],
        },
        {
          name: 'relationships',
          columns: ['*'],
        },
        {
          name: 'permissions',
          columns: ['*'],
        },
        {
          name: 'unique_constraints',
          columns: ['*'],
        },
        {
          name: 'check_constraints',
          columns: ['*'],
          order_by: {
            column: 'constraint_name',
            type: 'asc',
          },
        },
        {
          name: 'computed_fields',
          columns: ['*'],
          order_by: {
            column: 'computed_field_name',
            type: 'asc',
          },
        },
      ],
      order_by: [{ column: 'table_name', type: 'asc' }],
    },
  };

  if (
    (options.schemas && options.schemas.length !== 0) ||
    (options.tables && options.tables.length !== 0)
  ) {
    query.where = {
      $or: [],
    };
  }
  if (options.schemas) {
    options.schemas.forEach(schemaName => {
      query.where.$or.push({
        table_schema: schemaName,
      });
    });
  }
  if (options.tables) {
    options.tables.forEach(tableInfo => {
      query.where.$or.push({
        table_schema: tableInfo.table_schema,
        table_name: tableInfo.table_name,
      });
    });
  }

  return query;
};

const generateWhereClause = (options: Options) => {
  let whereClause = '';

  const whereCondtions: string[] = [];
  if (options.schemas) {
    options.schemas.forEach(schemaName => {
      whereCondtions.push(`(ist.table_schema='${schemaName}')`);
    });
  }
  if (options.tables) {
    options.tables.forEach(tableInfo => {
      whereCondtions.push(
        `(ist.table_schema='${tableInfo.table_schema}' and ist.table_name='${tableInfo.table_name}')`
      );
    });
  }

  if (whereCondtions.length > 0) {
    whereClause = 'where';
  }

  whereCondtions.forEach((whereInfo, index) => {
    whereClause = whereClause + ` ${whereInfo}`;
    if (index + 1 !== whereCondtions.length) {
      whereClause = whereClause + ' or';
    }
  });

  return whereClause;
};

export const fetchTrackedTableFkQuery = (options: Options) => {
  const whereQuery = generateWhereClause(options);

  const runSql = `select 
  COALESCE(
    json_agg(
      row_to_json(info)
    ), 
    '[]' :: JSON
  ) AS tables 
FROM 
  (
    select
      hdb_fkc.*, 
      fk_ref_table.table_name IS NOT NULL AS is_ref_table_tracked 
    from 
      hdb_catalog.hdb_table AS ist 
      JOIN hdb_catalog.hdb_foreign_key_constraint AS hdb_fkc ON hdb_fkc.table_schema = ist.table_schema 
      and hdb_fkc.table_name = ist.table_name 
      LEFT OUTER JOIN hdb_catalog.hdb_table AS fk_ref_table ON fk_ref_table.table_schema = hdb_fkc.ref_table_table_schema 
      and fk_ref_table.table_name = hdb_fkc.ref_table
    ${whereQuery}
  ) as info
`;
  return getRunSqlQuery(
    runSql,
    false,
    checkFeatureSupport(READ_ONLY_RUN_SQL_QUERIES) ? true : false
  );
};

export const fetchTrackedTableReferencedFkQuery = (options: Options) => {
  const whereQuery = generateWhereClause(options);

  const runSql = `select 
  COALESCE(
    json_agg(
      row_to_json(info)
    ), 
    '[]' :: JSON
  ) AS tables 
FROM 
  (
    select DISTINCT ON (hdb_fkc.constraint_oid)
      hdb_fkc.*, 
      fk_ref_table.table_name IS NOT NULL AS is_table_tracked,
      hdb_uc.constraint_name IS NOT NULL AS is_unique
    from 
      hdb_catalog.hdb_table AS ist 
      JOIN hdb_catalog.hdb_foreign_key_constraint AS hdb_fkc ON hdb_fkc.ref_table_table_schema = ist.table_schema 
      and hdb_fkc.ref_table = ist.table_name 
      LEFT OUTER JOIN hdb_catalog.hdb_table AS fk_ref_table ON fk_ref_table.table_schema = hdb_fkc.table_schema 
      and fk_ref_table.table_name = hdb_fkc.table_name
      LEFT OUTER JOIN hdb_catalog.hdb_unique_constraint AS hdb_uc ON hdb_uc.table_schema = hdb_fkc.table_schema
      and hdb_uc.table_name = hdb_fkc.table_name and ARRAY(select json_array_elements_text(hdb_uc.columns) ORDER BY json_array_elements_text) = ARRAY(select json_object_keys(hdb_fkc.column_mapping) ORDER BY json_object_keys)
    ${whereQuery}
  ) as info
`;
  return getRunSqlQuery(
    runSql,
    false,
    checkFeatureSupport(READ_ONLY_RUN_SQL_QUERIES) ? true : false
  );
};

export const fetchTableListQuery = (options: Options) => {
  const whereQuery = generateWhereClause(options);

  // TODO: optimise this. Multiple OUTER JOINS causes data bloating
  const runSql = `
select 
  COALESCE(
    json_agg(
      row_to_json(info)
    ), 
    '[]' :: JSON
  ) AS tables 
FROM 
  (
    select 
      ist.table_schema, 
      ist.table_name,
      ist.table_type,
      obj_description(
        (
          quote_ident(ist.table_schema) || '.' || quote_ident(ist.table_name)
        ):: regclass, 
        'pg_class'
      ) AS comment, 
      COALESCE(json_agg(
        DISTINCT row_to_json(is_columns) :: JSONB || jsonb_build_object(
          'comment',
          (
            SELECT 
              pg_catalog.col_description(
                c.oid, is_columns.ordinal_position :: int
              ) 
            FROM 
              pg_catalog.pg_class c 
            WHERE 
              c.oid = (quote_ident(ist.table_schema) || '.' || quote_ident(ist.table_name)):: regclass :: oid
              AND c.relname = is_columns.table_name
          )
        )
      ) FILTER (WHERE is_columns.column_name IS NOT NULL), '[]' :: JSON) AS columns,
      COALESCE(json_agg(
        DISTINCT row_to_json(is_triggers) :: JSONB || jsonb_build_object(
          'comment',
          (
            SELECT description FROM pg_description JOIN pg_trigger ON pg_description.objoid = pg_trigger.oid 
            WHERE 
              tgname = is_triggers.trigger_name 
              AND tgrelid = (quote_ident(is_triggers.event_object_schema) || '.' || quote_ident(is_triggers.event_object_table)):: regclass :: oid
          )
        )
      ) FILTER (WHERE is_triggers.trigger_name IS NOT NULL), '[]' :: JSON) AS triggers,
      row_to_json(is_views) AS view_info
    FROM 
      information_schema.tables AS ist 
      LEFT OUTER JOIN information_schema.columns AS is_columns ON 
        is_columns.table_schema = ist.table_schema 
        AND is_columns.table_name = ist.table_name 
      LEFT OUTER JOIN information_schema.views AS is_views ON is_views.table_schema = ist.table_schema
        AND is_views.table_name = ist.table_name
      LEFT OUTER JOIN information_schema.triggers AS is_triggers ON 
        is_triggers.event_object_schema = ist.table_schema AND 
        is_triggers.event_object_table = ist.table_name
    ${whereQuery} 
    GROUP BY 
      ist.table_schema, 
      ist.table_name,
      ist.table_type,
      is_views.*
  ) AS info
`;
  return getRunSqlQuery(
    runSql,
    false,
    checkFeatureSupport(READ_ONLY_RUN_SQL_QUERIES) ? true : false
  );
};

export const mergeLoadSchemaData = (
  infoSchemaTableData: AllSchemas,
  hdbTableData: AllSchemas,
  fkData: ForeignKeyConstraint[],
  refFkData: Array<{ ref_table_table_schema: string; ref_table: string }>
) => {
  const _mergedTableData: AllSchemas = [];

  infoSchemaTableData.forEach(infoSchemaTableInfo => {
    const _tableSchema = infoSchemaTableInfo.table_schema;
    const _tableName = infoSchemaTableInfo.table_name;

    const trackedTableInfo = hdbTableData.find(
      t => t.table_schema === _tableSchema && t.table_name === _tableName
    );

    const _isTableTracked = trackedTableInfo ? true : false;

    const _columns = infoSchemaTableInfo.columns;
    const _comment = infoSchemaTableInfo.comment;
    const _tableType = infoSchemaTableInfo.table_type;
    const _triggers = infoSchemaTableInfo.triggers; // TODO: get from v1/query
    const _viewInfo = infoSchemaTableInfo.view_info; // TODO: get from v1/query

    let _primaryKey: Schema['primary_key'] = null;
    let _relationships: Relationship[] = [];
    let _permissions: SchemaPermission[] = [];
    let _uniqueConstraints = [];
    let _fkConstraints: ForeignKeyConstraint[] = [];
    let _refFkConstraints: any = [];
    let _isEnum = false;
    let _checkConstraints = [];
    let _configuration = {};
    let _computed_fields = [];

    if (_isTableTracked) {
      _primaryKey = trackedTableInfo!.primary_key;
      _relationships = trackedTableInfo!.relationships;
      _permissions = trackedTableInfo!.permissions;
      _uniqueConstraints = trackedTableInfo!.unique_constraints;
      _isEnum = trackedTableInfo!.is_enum;
      _checkConstraints = trackedTableInfo!.check_constraints;
      _configuration = trackedTableInfo!.configuration;
      _computed_fields = trackedTableInfo!.computed_fields;

      _fkConstraints = fkData.filter(
        fk => fk.table_schema === _tableSchema && fk.table_name === _tableName
      );

      _refFkConstraints = refFkData.filter(
        fk =>
          fk.ref_table_table_schema === _tableSchema &&
          fk.ref_table === _tableName
      );
    }

    const _mergedInfo = {
      table_schema: _tableSchema,
      table_name: _tableName,
      table_type: _tableType,
      is_table_tracked: _isTableTracked,
      columns: _columns,
      comment: _comment,
      triggers: _triggers,
      primary_key: _primaryKey,
      relationships: _relationships,
      permissions: _permissions,
      unique_constraints: _uniqueConstraints,
      check_constraints: _checkConstraints,
      foreign_key_constraints: _fkConstraints,
      opp_foreign_key_constraints: _refFkConstraints,
      view_info: _viewInfo,
      is_enum: _isEnum,
      configuration: _configuration,
      computed_fields: _computed_fields,
    };

    _mergedTableData.push(_mergedInfo);
  });

  return _mergedTableData;
};

export const commonDataTypes = [
  {
    name: 'Integer',
    value: 'integer',
    description: 'signed four-byte integer',
    hasuraDatatype: 'integer',
  },
  {
    name: 'Integer (auto-increment)',
    value: 'serial',
    description: 'autoincrementing four-byte integer',
    hasuraDatatype: null,
  },
  {
    name: 'Text',
    value: 'text',
    description: 'variable-length character string',
    hasuraDatatype: 'text',
  },
  {
    name: 'Boolean',
    value: 'boolean',
    description: 'logical Boolean (true/false)',
    hasuraDatatype: 'boolean',
  },
  {
    name: 'Numeric',
    value: 'numeric',
    description: 'exact numeric of selected precision',
    hasuraDatatype: 'numeric',
  },
  {
    name: 'Timestamp',
    value: 'timestamptz',
    description: 'date and time, including time zone',
    hasuraDatatype: 'timestamp with time zone',
  },
  {
    name: 'Time',
    value: 'timetz',
    description: 'time of day (no time zone)',
    hasuraDatatype: 'time with time zone',
  },
  {
    name: 'Date',
    value: 'date',
    description: 'calendar date (year, month, day)',
    hasuraDatatype: 'date',
  },
  {
    name: 'UUID',
    value: 'uuid',
    description: 'universal unique identifier',
    hasuraDatatype: 'uuid',
  },
  {
    name: 'JSONB',
    value: 'jsonb',
    description: 'binary format JSON data',
    hasuraDatatype: 'jsonb',
  },
  {
    name: 'Big Integer',
    value: 'bigint',
    description: 'signed eight-byte integer',
    hasuraDatatype: 'bigint',
  },
  {
    name: 'Big Integer (auto-increment)',
    value: 'bigserial',
    description: 'autoincrementing eight-byte integer',
    hasuraDatatype: null,
  },
];

/*
 * Fetch non-composite types, primitive types like text, varchar etc,
 * Filter types whose typename is unknown and type category is not 'Pseudo' and it is valid and available to be used
 * */
export const fetchColumnTypesQuery = `
SELECT 
  string_agg(t.typname, ',') as "Type Name",
  string_agg(pg_catalog.format_type(t.oid, NULL), ',') as "Display Name",
  string_agg(coalesce(pg_catalog.obj_description(t.oid, 'pg_type'), ''), ':') as "Descriptions",
  t.typcategory
FROM pg_catalog.pg_type t
     LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
  AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
  AND pg_catalog.pg_type_is_visible(t.oid)
  AND t.typname != 'unknown'
  AND t.typcategory != 'P'
GROUP BY t.typcategory;`;

export const fetchColumnDefaultFunctions = (schema = 'public') => `
SELECT string_agg(pgp.proname, ','),
  t.typname as "Type"
from pg_proc pgp
JOIN pg_type t
ON pgp.prorettype = t.oid
JOIN pg_namespace pgn
ON pgn.oid = pgp.pronamespace
WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
  AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
  AND pg_catalog.pg_type_is_visible(t.oid)
  AND t.typname != 'unknown'
  AND t.typcategory != 'P'
  AND (array_length(pgp.proargtypes, 1) = 0)
  AND ( pgn.nspname = '${schema}' OR pgn.nspname = 'pg_catalog' )
  AND pgp.proretset=false
GROUP BY t.typname
ORDER BY t.typname ASC;
`;

const postgresFunctionTester = /.*\(\)$/gm;

export const isPostgresFunction = (str: string) =>
  new RegExp(postgresFunctionTester).test(str);

const configsEqual = (config1: DisplayConfig, config2: DisplayConfig) => {
  return (
    config1.tableName === config2.tableName &&
    config1.schemaName === config2.schemaName &&
    config1.constraintName === config2.constraintName
  );
};

export const mergeDisplayConfig = (
  config: DisplayConfig,
  opts: ConsoleOpts
) => {
  let newDisplaConfigs: ConsoleOpts['fkDisplayNames'];

  if (!opts.fkDisplayNames || !opts.fkDisplayNames.length) {
    newDisplaConfigs = [config];
  } else {
    let configExists = false;
    newDisplaConfigs = opts.fkDisplayNames.map(currConfig => {
      if (configsEqual(currConfig, config)) {
        configExists = true;
        return {
          ...currConfig,
          mappings: config.mappings,
        };
      }
      return currConfig;
    });
    if (!configExists) {
      newDisplaConfigs = [...opts.fkDisplayNames, config];
    }
  }

  return {
    ...opts,
    fkDisplayNames: newDisplaConfigs,
  };
};

export const removeDisplayConfig = (
  displayConfig: Omit<DisplayConfig, 'mappings'>,
  opts: ConsoleOpts
) => {
  const newDisplaConfigs = opts.fkDisplayNames.filter(
    config => !equalTableDefs(config, displayConfig)
  );

  return {
    ...opts,
    fkDisplayNames: newDisplaConfigs,
  };
};

export const createTableMappings = (
  data: Array<Record<string, any>>,
  mappings: Mappings[]
) => {
  const result = [];
  for (let i = 0; i < data.length; ++i) {
    result.push({
      from: mappings[i].columnName,
      to: mappings[i].refColumnName,
      displayName: mappings[i].displayColumnName,
      refTable: mappings[i].refTableName,
      data: data[i],
    });
  }

  return result;
};

export const getDisplayNamesPerKey = (
  consoleOpts: ConsoleOpts,
  tableSchema: Schema,
  fkModify: ForeignKey[]
) => {
  if (!consoleOpts || !consoleOpts.fkDisplayNames) return;

  const currentTableMappings = consoleOpts.fkDisplayNames.filter(
    m =>
      m.tableName === tableSchema.table_name &&
      m.schemaName === tableSchema.table_schema
  );

  // TODO: explain why I'm doing this
  const newConfig: Record<string, string[]> = {};
  if (fkModify && fkModify.length > 0) {
    fkModify.forEach(fk => {
      const sortedDisplayColumnNames: string[] = [];
      const currentFkMappings = currentTableMappings.find(
        opts => opts.constraintName === fk.constraintName
      );
      console.log({ currentFkMappings });
      if (!currentFkMappings) return;
      fk.colMappings.forEach(colMapping => {
        const newDN = currentFkMappings.mappings.find(
          m =>
            // m.columnName === colMapping.column && why there is number
            m.refColumnName === colMapping.refColumn &&
            m.refTableName === fk.refTableName
        );
        if (newDN) {
          sortedDisplayColumnNames.push(newDN.displayColumnName);
        }
      });
      newConfig[fk.constraintName] = sortedDisplayColumnNames;
    });
  }
  return newConfig;
};
