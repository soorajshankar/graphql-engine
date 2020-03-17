import React from 'react';

import { JSONB, JSONDTYPE, TEXT, BOOLEAN, getPlaceholder } from '../../utils';
import JsonInput from '../../../../Common/CustomInputTypes/JsonInput';
import TextInput from '../../../../Common/CustomInputTypes/TextInput';
import styles from '../../../../Common/TableCommon/Table.scss';
import { isColumnAutoIncrement } from '../../../../Common/utils/pgUtils';
import SearchableSelect from '../../../../Common/SearchableSelect/SearchableSelect';

const searchableSelectStyles = {
  container: {
    width: '270px'
  },
  control: {
    minHeight: '34px'
  },
  dropdownIndicator: {
    padding: '5px'
  },
  valueContainer: {
    padding: '0px 12px'
  }
};

type Column = {
  column_name: string;
  data_type: string;
  column_default: string;
};

type Props = {
  enumOptions: Record<string, string[]>;
  col: Column;
  index: number;
  clone: Record<string, any>;
  inputRef: React.Ref<any>;
  onChange: () => void;
  onFocus: () => void;
  prevValue: string;
  hasDefault: boolean;
  fkOptions: Array<{
    from: string;
    to: string;
    displayName: string;
    data: Array<Record<string, string>>;
  }>;
};

export const TypedInput: React.FC<Props> = ({
  enumOptions,
  col,
  index,
  clone,
  inputRef,
  onChange,
  onFocus,
  prevValue,
  hasDefault,
  fkOptions
}) => {
  const {
    column_name: colName,
    data_type: colType,
    column_default: colDefault
  } = col;

  const isAutoIncrement = isColumnAutoIncrement(col);
  const placeHolder = hasDefault ? colDefault : getPlaceholder(colType);
  const getDefaultValue = () => {
    if (prevValue) return prevValue;
    if (clone && colName in clone) return clone[colName];
    return '';
  };

  const onClick = (
    e: React.MouseEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const element = (e.target as HTMLInputElement)
      .closest('.radio-inline')
      ?.querySelector('input[type="radio"]');

    if (element) {
      (element as HTMLInputElement).checked = true;
    }

    (e.target as HTMLInputElement).focus();
  };

  const standardInputProps = {
    onChange,
    onFocus,
    onClick,
    ref: inputRef,
    'data-test': `typed-input-${index}`,
    className: `form-control ${styles.insertBox}`,
    defaultValue: getDefaultValue(),
    type: 'text',
    placeholder: 'text'
  };

  if (enumOptions && enumOptions[colName]) {
    return (
      <select
        {...standardInputProps}
        className={`form-control ${styles.insertBox}`}
        defaultValue={prevValue || ''}
      >
        <option disabled value="">
          -- enum value --
        </option>
        {enumOptions[colName].map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  const columnFkOpts =
    fkOptions && fkOptions.find(opts => opts.from === colName);
  if (columnFkOpts) {
    const options = columnFkOpts.data.map(row => ({
      label: row[columnFkOpts.displayName],
      value: row[columnFkOpts.to]
    }));
    delete standardInputProps.ref; // TODO
    return (
      <SearchableSelect
        {...standardInputProps}
        options={options}
        onChange={console.log}
        value={'' /* to do */}
        bsClass={styles.insertBox}
        styleOverrides={searchableSelectStyles}
        filterOption="prefix"
        placeholder="column_type"
      />
    );
  }

  if (isAutoIncrement) {
    return <input {...standardInputProps} readOnly placeholder={placeHolder} />;
  }

  if (prevValue && typeof prevValue === 'object') {
    return (
      <JsonInput
        standardProps={{
          ...standardInputProps,
          defaultValue: JSON.stringify(prevValue)
        }}
        placeholderProp={getPlaceholder(colType)}
      />
    );
  }

  switch (colType) {
    case JSONB:
    case JSONDTYPE:
      return (
        <JsonInput
          {...standardInputProps}
          defaultValue={
            prevValue ? JSON.stringify(prevValue) : getDefaultValue()
          }
          placeholderProp={placeHolder}
        />
      );

    case TEXT:
      return (
        <TextInput
          standardProps={standardInputProps}
          placeholderProp={placeHolder}
        />
      );

    case BOOLEAN:
      return (
        <select {...standardInputProps} defaultValue={placeHolder}>
          <option value="" disabled>
            -- bool --
          </option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );

    default:
      return <input {...standardInputProps} placeholder={placeHolder} />;
  }
};
