import React, { useCallback, useContext, useEffect, useState } from 'react';
import { FieldType } from './types';
import { PermissionEditorContext } from './context';
import { CollapsedField } from './CollapsedField';
import { ArgSelect } from './ArgSelect';
import { isEmpty } from '../../../Common/utils/jsUtils';

interface FieldProps {
  i: FieldType;
  setItem: (e?: FieldType) => void;
}

export const Field: React.FC<FieldProps> = ({ i, setItem = e => console.log(e) }) => {
  const context: any = useContext(PermissionEditorContext);
  const initState =
    context.argTree && context.argTree[i.name]
      ? { ...context.argTree[i.name] }
      : {};
  const [fieldVal, setfieldVal] = useState<Record<string,any>>(initState);
  const setArg = useCallback(
    (vStr: Record<string, unknown>) => {
      setfieldVal(oldVal => {
        const newState = {
          ...oldVal,
          ...vStr,
        };
        return newState;
      });
    },
    [setItem, i]
  );
  useEffect((...args) => {
    if (
      fieldVal &&
      fieldVal !== {} &&
      Object.keys(fieldVal).length > 0 &&
      !isEmpty(fieldVal)
    ) {
      context.setArgTree(argTree => {
        return { ...argTree, [i.name]: fieldVal };
      });
    }
  }, [fieldVal]);

  const handleClick = e => {
    e.preventDefault();
    const selectedTypeName = e.target.id;
    const selectedUrl = e.target.href;
    console.log(selectedTypeName,selectedUrl)
  };

  if (!i.checked) return <CollapsedField field={i} onClick={handleClick} />;
  return (
    <b>
      <b id={i.name}>{i.name}</b>
      {i.args && ' ('}
      <ul>
        {i.args &&
          Object.entries(i.args).map(([k, v]) => (
            <ArgSelect
              {...{
                key: k,
                k,
                v,
                value: fieldVal[k],
                setArg,
                level: 0,
              }}
            />
          ))}
      </ul>
      <ul>
        {i.args && ' )'}
        {i.return && (
          <>
            :
            <a
              onClick={handleClick}
              id={`${i.return.replace(/[^\w\s]/gi, '')}`}
              href={`${i.return.replace(/[^\w\s]/gi, '')}`}
            >
              {i.return}
            </a>
          </>
        )}
      </ul>
    </b>
  );
};
