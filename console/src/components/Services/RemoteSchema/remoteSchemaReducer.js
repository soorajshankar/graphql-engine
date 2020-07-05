import { combineReducers } from 'redux';

import listReducer from './Actions';
import addReducer from './Add/addRemoteSchemaReducer';
import headerReducer from '../../Common/Layout/ReusableHeader/HeaderReducer';

const remoteSchemaReducer = combineReducers({
  addData: addReducer,
  listData: listReducer,
  headerData: headerReducer([
    {
      name: '',
      type: 'static',
      value: '',
    },
  ]),
});

export default remoteSchemaReducer;
