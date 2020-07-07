import { push } from 'react-router-redux';
import { AnyAction } from 'redux';

/* defaultState */

import { addState } from '../state';
/* */

import Endpoints, { globalCookiePolicy } from '../../../../Endpoints';
import requestAction from '../../../../utils/requestAction';
import dataHeaders from '../../Data/Common/Headers';
import { fetchRemoteSchemas, makeRequest } from '../Actions';

// import { UPDATE_MIGRATION_STATUS_ERROR } from '../../../Main/Actions';
import { appPrefix } from '../constants';

import globals from '../../../../Globals';
import { clearIntrospectionSchemaCache } from '../graphqlUtils';
import { defaultHeader, Header } from '../../../Common/Headers/Headers';

import { RawHeaderType, Thunk } from '../../../../types';

const prefixUrl = globals.urlPrefix + appPrefix;

/* */
const MANUAL_URL_CHANGED = '@addRemoteSchema/MANUAL_URL_CHANGED';
const ENV_URL_CHANGED = '@addRemoteSchema/ENV_URL_CHANGED';
const NAME_CHANGED = '@addRemoteSchema/NAME_CHANGED';
const TIMEOUT_CONF_CHANGED = '@addRemoteSchema/TIMEOUT_CONF_CHANGED';
// const HEADER_CHANGED = '@addRemoteSchema/HEADER_CHANGED';
const ADDING_REMOTE_SCHEMA = '@addRemoteSchema/ADDING_REMOTE_SCHEMA';
const ADD_REMOTE_SCHEMA_FAIL = '@addRemoteSchema/ADD_REMOTE_SCHEMA_FAIL';
const RESET = '@addRemoteSchema/RESET';
const FETCHING_INDIV_REMOTE_SCHEMA =
  '@addRemoteSchema/FETCHING_INDIV_REMOTE_SCHEMA';
const REMOTE_SCHEMA_FETCH_SUCCESS =
  '@addRemoteSchema/REMOTE_SCHEMA_FETCH_SUCCESS';
const REMOTE_SCHEMA_FETCH_FAIL = '@addRemoteSchema/REMOTE_SCHEMA_FETCH_FAIL';

const DELETING_REMOTE_SCHEMA = '@addRemoteSchema/DELETING_REMOTE_SCHEMA';
const DELETE_REMOTE_SCHEMA_FAIL = '@addRemoteSchema/DELETE_REMOTE_SCHEMA_FAIL';

const MODIFY_REMOTE_SCHEMA_FAIL = '@addRemoteSchema/MODIFY_REMOTE_SCHEMA_FAIL';
const MODIFYING_REMOTE_SCHEMA = '@addRemoteSchema/MODIFYING_REMOTE_SCHEMA';

const UPDATE_FORWARD_CLIENT_HEADERS =
  '@addRemoteSchema/UPDATE_FORWARD_CLIENT_HEADERS';

/* */
const TOGGLE_MODIFY = '@editRemoteSchema/TOGGLE_MODIFY';
/* */
/* */
export const RESET_HEADER = '@remoteSchema/RESET_HEADER';
export const UPDATE_HEADERS = '@remoteSchema/UPDATE_HEADERS';

// types
type AddStateType = typeof addState;

type RawRemoteSchema = {
  name: string;
  definition: {
    url?: string;
    id?: string;
    url_from_env?: string;
    headers: Header[];
    timeout_seconds?: string | number;
    forward_client_headers: Header[];
  };
};
type InputEventMapType = {
  name?: string;
  envName?: string;
  manualUrl?: string;
  timeoutConf?: string;
};

const inputEventMap: InputEventMapType = {
  name: NAME_CHANGED,
  envName: ENV_URL_CHANGED,
  manualUrl: MANUAL_URL_CHANGED,
  timeoutConf: TIMEOUT_CONF_CHANGED,
};

/* Action creators */
const inputChange = (type: keyof InputEventMapType, data: unknown): Thunk => {
  return dispatch => dispatch({ type: inputEventMap[type], data });
};

/* */

const getReqHeader = (headers: Header[]) => {
  const requestHeaders: InputEventMapType[] = [];

  const headersObj = headers.filter(h => h.name && h.name.length > 0);
  if (headersObj.length > 0) {
    headersObj.forEach(h => {
      const reqHead: InputEventMapType = {
        name: h.name,
        ...(h.type === 'static' && { value: h.value }),
        ...(h.type !== 'static' && { value_from_env: h.value }),
      };

      requestHeaders.push(reqHead);
    });
  }

  return requestHeaders;
};

const fetchRemoteSchema = (remoteSchema: string): Thunk => {
  return (dispatch, getState) => {
    const url = Endpoints.getSchema;
    const options: RequestInit = {
      credentials: globalCookiePolicy,
      method: 'POST',
      headers: dataHeaders(getState),
      body: JSON.stringify({
        type: 'select',
        args: {
          table: {
            name: 'remote_schemas',
            schema: 'hdb_catalog',
          },
          columns: ['*'],
          where: {
            name: remoteSchema,
          },
        },
      }),
    };
    const onSuccess = (data: RawHeaderType[]) => {
      if (data.length > 0) {
        dispatch({ type: REMOTE_SCHEMA_FETCH_SUCCESS, data });
        const headerObj = [];
        const rawData = data[0] as RawRemoteSchema;
        rawData.definition.headers.forEach((d: RawHeaderType) => {
          headerObj.push({
            name: d.name,
            value: d.value ? d.value : d.value_from_env,
            type: d.value ? 'static' : 'env',
          });
        });
        headerObj.push({
          name: '',
          type: 'static',
          value: '',
        });
        dispatch({
          type: UPDATE_HEADERS,
          data: [...headerObj],
        });
        return Promise.resolve();
      }
      dispatch(push(`${prefixUrl}`));
    };
    const onError = (error: unknown) => {
      console.error(`Failed to fetch remoteSchema ${JSON.stringify(error)}`);
      return dispatch({ type: REMOTE_SCHEMA_FETCH_FAIL, data: error });
    };
    dispatch({ type: FETCHING_INDIV_REMOTE_SCHEMA });
    return dispatch(requestAction(url, options)).then(onSuccess, onError);
  };
};

const addRemoteSchema = (headers = []): Thunk => {
  return (dispatch, getState) => {
    const currState = getState().remoteSchemas.addData;
    // const url = Endpoints.getSchema;

    let timeoutSeconds = parseInt(currState.timeoutConf, 10);
    if (Number.isNaN(timeoutSeconds)) timeoutSeconds = 60;

    const resolveObj = {
      name: currState.name.trim().replace(/ +/g, ''),
      definition: {
        url: currState.manualUrl,
        url_from_env: currState.envName,
        headers: [...getReqHeader(headers)],
        timeout_seconds: timeoutSeconds,
        forward_client_headers: currState.forwardClientHeaders,
      },
    };

    if (resolveObj.definition.url) {
      delete resolveObj.definition.url_from_env;
    } else {
      delete resolveObj.definition.url;
    }
    /* TODO: Add mandatory fields validation */

    const migrationName = `create_remote_schema_${currState.name
      .trim()
      .replace(/ +/g, '')}`;

    const payload = {
      type: 'add_remote_schema',
      args: {
        ...resolveObj,
      },
    };

    const downPayload = {
      type: 'remove_remote_schema',
      args: {
        name: currState.name,
      },
    };

    const upQueryArgs = [];
    upQueryArgs.push(payload);
    const downQueryArgs = [];
    downQueryArgs.push(downPayload);
    const upQuery = {
      type: 'bulk',
      args: upQueryArgs,
    };

    const downQuery = {
      type: 'bulk',
      args: downQueryArgs,
    };

    const requestMsg = 'Adding remote schema...';
    const successMsg = 'Remote schema added successfully';
    const errorMsg = 'Adding remote schema failed';

    const customOnSuccess = (data: unknown) => {
      Promise.all([
        dispatch({ type: RESET }),
        dispatch(fetchRemoteSchemas()).then(() => {
          dispatch(push(`${prefixUrl}/manage/${resolveObj.name}/details`));
        }),
        dispatch({ type: RESET_HEADER, data }),
      ]);
    };
    const customOnError = (err: unknown) => {
      console.error(`Failed to create remote schema${JSON.stringify(err)}`);
      dispatch({ type: ADD_REMOTE_SCHEMA_FAIL, data: err });
      // dispatch({ type: UPDATE_MIGRATION_STATUS_ERROR, data: err });
      // alert(JSON.stringify(err));
    };
    dispatch({ type: ADDING_REMOTE_SCHEMA });
    return dispatch(
      makeRequest(
        upQuery.args,
        downQuery.args,
        migrationName,
        customOnSuccess,
        customOnError,
        requestMsg,
        successMsg,
        errorMsg
      )
    );
  };
};

const deleteRemoteSchema = (): Thunk => {
  return (dispatch, getState) => {
    const currState = getState().remoteSchemas.addData;
    // const url = Endpoints.getSchema;
    const resolveObj = {
      name: currState.editState.originalName,
    };
    const migrationName = `remove_remote_schema_${resolveObj.name
      .trim()
      .replace(/ +/g, '')}`;
    const payload = {
      type: 'remove_remote_schema',
      args: {
        name: currState.editState.originalName,
      },
    };
    const downPayload = {
      type: 'add_remote_schema',
      args: {
        name: currState.editState.originalName,
        definition: {
          url: currState.editState.originalUrl,
          url_from_env: currState.editState.originalEnvUrl,
          headers: [],
          forward_client_headers:
            currState.editState.originalForwardClientHeaders,
        },
      },
    };

    downPayload.args.definition.headers = [
      ...currState.editState.originalHeaders,
    ];

    const upQueryArgs = [];
    upQueryArgs.push(payload);
    const downQueryArgs = [];
    downQueryArgs.push(downPayload);
    const upQuery = {
      type: 'bulk',
      args: upQueryArgs,
    };
    const downQuery = {
      type: 'bulk',
      args: downQueryArgs,
    };
    const requestMsg = 'Deleting remote schema...';
    const successMsg = 'Remote schema deleted successfully';
    const errorMsg = 'Delete remote schema failed';

    const customOnSuccess = () => {
      // dispatch({ type: REQUEST_SUCCESS });
      Promise.all([
        dispatch({ type: RESET }),
        dispatch(push(prefixUrl)),
        dispatch(fetchRemoteSchemas()),
      ]);
      clearIntrospectionSchemaCache();
    };
    const customOnError = (error: unknown) => {
      Promise.all([dispatch({ type: DELETE_REMOTE_SCHEMA_FAIL, data: error })]);
    };

    dispatch({ type: DELETING_REMOTE_SCHEMA });
    return dispatch(
      makeRequest(
        upQuery.args,
        downQuery.args,
        migrationName,
        customOnSuccess,
        customOnError,
        requestMsg,
        successMsg,
        errorMsg
      )
    );
  };
};

const modifyRemoteSchema = (headers = []): Thunk => {
  return (dispatch, getState) => {
    const currState = getState().remoteSchemas.addData;
    const remoteSchemaName = currState.name.trim().replace(/ +/g, '');
    // const url = Endpoints.getSchema;
    const upQueryArgs = [];
    const downQueryArgs = [];
    const migrationName = `update_remote_schema_${remoteSchemaName}`;
    const deleteRemoteSchemaUp = {
      type: 'remove_remote_schema',
      args: {
        name: currState.editState.originalName,
      },
    };

    let newTimeout = parseInt(currState.timeoutConf, 10);
    let oldTimeout = parseInt(currState.editState.originalTimeoutConf, 10);
    if (Number.isNaN(newTimeout)) newTimeout = 60;
    if (Number.isNaN(oldTimeout)) oldTimeout = 60;

    const resolveObj = {
      name: remoteSchemaName,
      definition: {
        url: currState.manualUrl,
        url_from_env: currState.envName,
        timeout_seconds: newTimeout,
        forward_client_headers: currState.forwardClientHeaders,
        headers: [...getReqHeader(headers)],
      },
    };

    if (resolveObj.definition.url) {
      delete resolveObj.definition.url_from_env;
    } else {
      delete resolveObj.definition.url;
    }

    const createRemoteSchemaUp = {
      type: 'add_remote_schema',
      args: {
        ...resolveObj,
      },
    };
    upQueryArgs.push(deleteRemoteSchemaUp);
    upQueryArgs.push(createRemoteSchemaUp);

    // Delete the new one and create the old one
    const deleteRemoteSchemaDown = {
      type: 'remove_remote_schema',
      args: {
        name: remoteSchemaName,
      },
    };

    const resolveDownObj = {
      name: currState.editState.originalName,
      definition: {
        url: currState.editState.originalUrl,
        url_from_env: currState.editState.originalEnvUrl,
        timeout_seconds: oldTimeout,
        headers: [],
        forward_client_headers:
          currState.editState.originalForwardClientHeaders,
      },
    };

    resolveDownObj.definition.headers = [
      ...currState.editState.originalHeaders,
    ];
    if (resolveDownObj.definition.url) {
      delete resolveDownObj.definition.url_from_env;
    } else {
      delete resolveDownObj.definition.url;
    }

    const createRemoteSchemaDown = {
      type: 'add_remote_schema',
      args: {
        ...resolveDownObj,
      },
    };

    downQueryArgs.push(deleteRemoteSchemaDown);
    downQueryArgs.push(createRemoteSchemaDown);
    // End of down

    const upQuery = {
      type: 'bulk',
      args: upQueryArgs,
    };
    const downQuery = {
      type: 'bulk',
      args: downQueryArgs,
    };

    const requestMsg = 'Modifying remote schema...';
    const successMsg = 'Remote schema modified';
    const errorMsg = 'Modify remote schema failed';

    const customOnSuccess = (data: unknown) => {
      // dispatch({ type: REQUEST_SUCCESS });
      dispatch({ type: RESET, data });
      dispatch(push(`${prefixUrl}/manage/schemas`)); // to avoid 404
      dispatch(fetchRemoteSchemas()).then(() => {
        dispatch(push(`${prefixUrl}/manage/${remoteSchemaName}/details`));
      });
      dispatch(fetchRemoteSchema(remoteSchemaName));
      clearIntrospectionSchemaCache();
    };
    const customOnError = (error: unknown) => {
      Promise.all([dispatch({ type: MODIFY_REMOTE_SCHEMA_FAIL, data: error })]);
    };

    dispatch({ type: MODIFYING_REMOTE_SCHEMA });
    return dispatch(
      makeRequest(
        upQuery.args,
        downQuery.args,
        migrationName,
        customOnSuccess,
        customOnError,
        requestMsg,
        successMsg,
        errorMsg
      )
    );
  };
};

const addRemoteSchemaReducer = (state = addState, action: AnyAction) => {
  switch (action.type) {
    case MANUAL_URL_CHANGED:
      return {
        ...state,
        manualUrl: action.data,
        envName: null,
      };
    case NAME_CHANGED:
      return {
        ...state,
        name: action.data,
      };
    case ENV_URL_CHANGED:
      return {
        ...state,
        envName: action.data,
        manualUrl: null,
      };
    case TIMEOUT_CONF_CHANGED:
      return {
        ...state,
        timeoutConf: action.data,
      };
    case ADDING_REMOTE_SCHEMA:
      return {
        ...state,
        isRequesting: true,
        isError: null,
      };
    case ADD_REMOTE_SCHEMA_FAIL:
      return {
        ...state,
        isRequesting: false,
        isError: action.data,
      };
    case TOGGLE_MODIFY:
      return {
        ...state,
        headers: [...state.editState.headers],
        editState: {
          ...state.editState,
          isModify: !state.editState.isModify,
        },
      };

    case RESET:
      return {
        ...addState,
      };
    case FETCHING_INDIV_REMOTE_SCHEMA:
      return {
        ...state,
        isFetching: true,
        isFetchError: null,
      };
    case REMOTE_SCHEMA_FETCH_SUCCESS:
      return {
        ...state,
        name: action.data[0].name,
        manualUrl: action.data[0].definition.url || null,
        envName: action.data[0].definition.url_from_env || null,
        headers: action.data[0].definition.headers || [],
        timeoutConf: action.data[0].definition.timeout_seconds
          ? action.data[0].definition.timeout_seconds.toString()
          : '60',
        forwardClientHeaders: action.data[0].definition.forward_client_headers,
        editState: {
          ...state,
          id: action.data[0].id,
          isModify: false,
          originalName: action.data[0].name,
          originalHeaders: action.data[0].definition.headers || [],
          originalUrl: action.data[0].definition.url || null,
          originalEnvUrl: action.data[0].definition.url_from_env || null,
          originalForwardClientHeaders:
            action.data[0].definition.forward_client_headers || false,
        },
        isFetching: false,
        isFetchError: null,
      };
    case REMOTE_SCHEMA_FETCH_FAIL:
      return {
        ...state,
        isFetching: false,
        isFetchError: action.data,
      };
    case DELETE_REMOTE_SCHEMA_FAIL:
      return {
        ...state,
        isRequesting: false,
        isError: action.data,
      };
    case DELETING_REMOTE_SCHEMA:
      return {
        ...state,
        isRequesting: true,
        isError: null,
      };
    case MODIFY_REMOTE_SCHEMA_FAIL:
      return {
        ...state,
        isRequesting: false,
        isError: action.data,
      };
    case MODIFYING_REMOTE_SCHEMA:
      return {
        ...state,
        isRequesting: true,
        isError: null,
      };
    case UPDATE_FORWARD_CLIENT_HEADERS:
      return {
        ...state,
        forwardClientHeaders: !state.forwardClientHeaders,
      };
    case RESET_HEADER:
      return {
        ...state,
        headers: [{ ...defaultHeader }],
      };
    case UPDATE_HEADERS:
      return {
        ...state,
        headers: [...action.data],
      };

    default:
      return {
        ...state,
      };
  }
};

export {
  inputChange,
  addRemoteSchema,
  fetchRemoteSchema,
  deleteRemoteSchema,
  modifyRemoteSchema,
  RESET,
  TOGGLE_MODIFY,
  UPDATE_FORWARD_CLIENT_HEADERS,
};

export default addRemoteSchemaReducer;
