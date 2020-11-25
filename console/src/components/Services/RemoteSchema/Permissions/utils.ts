import { findRemoteSchemaPermission } from '../utils';
import { PermissionEdit, SchemaDefinition } from './types';

export const getCreateRemoteSchemaPermissionQuery = (
  def: { role: string },
  remoteSchemaName: string,
  schemaDefinition: SchemaDefinition
) => {
  return {
    type: 'add_remote_schema_permissions',
    args: {
      remote_schema: remoteSchemaName,
      role: def.role,
      definition: {
        schema: schemaDefinition.value,
      },
    },
  };
};

export const getDropRemoteSchemaPermissionQuery = (
  role: string,
  remoteSchemaName: string
) => {
  return {
    type: 'drop_remote_schema_permissions',
    args: {
      remote_schema: remoteSchemaName,
      role,
    },
  };
};

export const getRemoteSchemaPermissionQueries = (
  permissionEdit: PermissionEdit,
  allPermissions: any,
  remoteSchemaName: string,
  schemaDefinition: SchemaDefinition
) => {
  const { role, newRole } = permissionEdit;

  const upQueries = [];
  const downQueries = [];

  const permRole = (newRole || role).trim();

  const existingPerm = findRemoteSchemaPermission(allPermissions, permRole);
  // const existingPerm = allPermissions.find(p => p.role_name === permRole);

  if (newRole || (!newRole && !existingPerm)) {
    upQueries.push(
      getCreateRemoteSchemaPermissionQuery(
        {
          role: permRole,
        },
        remoteSchemaName,
        schemaDefinition
      )
    );
    downQueries.push(
      getDropRemoteSchemaPermissionQuery(permRole, remoteSchemaName)
    );
  }

  if (existingPerm) {
    upQueries.push(
      getDropRemoteSchemaPermissionQuery(permRole, remoteSchemaName)
    );
    upQueries.push(
      getCreateRemoteSchemaPermissionQuery(
        { role: permRole },
        remoteSchemaName,
        schemaDefinition
      )
    );
    downQueries.push(
      getDropRemoteSchemaPermissionQuery(permRole, remoteSchemaName)
    );
    downQueries.push(
      getCreateRemoteSchemaPermissionQuery(
        { role: permRole },
        remoteSchemaName,
        existingPerm.definition
      )
    );
  }

  return {
    upQueries,
    downQueries,
  };
};

export const updateBulkSelect = (
  bulkSelect: string[],
  selectedRole: string,
  isAdd: boolean
) => {
  const bulkRes = isAdd
    ? [...bulkSelect, selectedRole]
    : bulkSelect.filter(e => e !== selectedRole);
  return bulkRes;
};

export const getTree = (schema: any, typeS: any) => {
  const fields =
    typeS === 'QUERY'
      ? schema.getQueryType().getFields()
      : schema.getMutationType().getFields();
  return Object.values(fields).map(
    ({ name, args: argArray, type, ...rest }: any) => {
      const args = argArray.reduce((p, c, cIx) => {
        return { ...p, [c.name]: { ...c } };
      }, {});
      return { name, checked: true, args, return: type.toString(), ...rest };
    }
  );
};

export const getType = (schema: any) => {
  const fields = schema.getTypeMap();
  console.log({ fields });
  const ret = fields;
  return ret;
};
