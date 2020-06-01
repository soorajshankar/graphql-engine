// this class is currently implemented only for count queries.

import { Operators } from '../../components/Services/Data/constants';
const parseCondition = cond => [Object.keys(cond)[0], Object.values(cond)[0]];

// structured in a way that it can be extended as a sql query converter
export default class RQL {
  table: string;
  where: string;

  constructor() {
    this.table = '';
    this.where = '';
    return this;
  }
  from = (table: string[] | string) => {
    if (typeof table === 'string') this.table = table;
    if (table instanceof Array)
      this.table = table.reduce((acc, i) => `${acc} , ${i}`, '');
  };

  where = (whr: object) => {
    let whereText = '';
    whr['$and'].forEach(i => {
      Object.entries(i).forEach(([key, val], i) => {
        const [op, value] = parseCondition(val);
        // op= getOperator(op);
        console.log(key);
        if (i === 0) whereText += `${key} ${op} ${value}`;
        whereText += `AND ${key} ${op} ${value}`;
      });
    });
    this.where = whereText;
  };
}
