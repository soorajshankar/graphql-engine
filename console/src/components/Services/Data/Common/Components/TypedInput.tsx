import React, { useState, useEffect, useRef, useMemo } from 'react';
import throttle from 'lodash.throttle';

import { JSONB, JSONDTYPE, TEXT, BOOLEAN, getPlaceholder } from '../../utils';
import JsonInput from '../../../../Common/CustomInputTypes/JsonInput';
import TextInput from '../../../../Common/CustomInputTypes/TextInput';
import styles from '../../../../Common/TableCommon/Table.scss';
import { isColumnAutoIncrement } from '../../../../Common/utils/pgUtils';
import SearchableSelect from '../../../../Common/SearchableSelect/SearchableSelect';

const searchableSelectStyles = {
  container: {
    width: '270px',
  },
  control: {
    minHeight: '34px',
  },
  dropdownIndicator: {
    padding: '5px',
  },
  valueContainer: {
    padding: '0px 12px',
  },
};

type Column = {
  column_name: string;
  data_type: string;
  column_default: string;
};

type FkColOption = {
  from: string;
  to: string;
  displayName: string;
  data: Array<Record<string, string>>;
};

type SelectOption = { value: string; label: string };

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
  fkOptions: Array<FkColOption>;
  getFkOptions: (opts: FkColOption, value: string) => Promise<void>;
  onFkValueChange?: (v: SelectOption) => void;
  selectedOption: SelectOption;
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
  fkOptions,
  getFkOptions,
  onFkValueChange,
  selectedOption,
}) => {
  const [searchValue, setSearchValue] = useState('');

  const {
    column_name: colName,
    data_type: colType,
    column_default: colDefault,
  } = col;

  const columnFkOpts = useRef<FkColOption>();
  columnFkOpts.current =
    fkOptions && fkOptions.find(opts => opts.from === colName);

  const getForeignKeyOptionsThrottled = useMemo(
    () =>
      throttle(
        (value: string) =>
          columnFkOpts.current && getFkOptions(columnFkOpts.current, value),
        1000
      ),
    [getFkOptions]
  );

  useEffect(() => {
    if (columnFkOpts) {
      getForeignKeyOptionsThrottled(searchValue);
    }
  }, [searchValue]);

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
    placeholder: 'text',
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

  if (columnFkOpts.current) {
    const options = columnFkOpts.current.data.map(row => ({
      // labels are in format `display name (actual ref value)`
      label: `${row[columnFkOpts.current!.displayName]} (${
        row[columnFkOpts.current!.to]
      })`,
      value: row[columnFkOpts.current!.to],
    }));
    delete standardInputProps.ref;
    return (
      <SearchableSelect
        {...standardInputProps}
        options={options}
        onChange={onFkValueChange}
        value={selectedOption}
        bsClass={styles.insertBox}
        styleOverrides={searchableSelectStyles}
        placeholder="column_type" // todo
        onInputChange={(v: string) => setSearchValue(v)}
        filterOption="fulltext"
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
          defaultValue: JSON.stringify(prevValue),
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
          standardProps={{
            ...standardInputProps,
            defaultValue: prevValue
              ? JSON.stringify(prevValue)
              : getDefaultValue(),
          }}
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
