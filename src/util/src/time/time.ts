import { parse,startOfWeek,endOfWeek,subWeeks,startOfMonth,endOfMonth,subMonths,startOfYear,endOfYear,subYears,addDays } from 'date-fns';
// import startOfWeek from 'date-fns/start_of_week';
// import endOfWeek from 'date-fns/end_of_week';
// import subWeeks from 'date-fns/sub_weeks';
// import startOfMonth from 'date-fns/start_of_month';
// import endOfMonth from 'date-fns/end_of_month';
// import subMonths from 'date-fns/sub_months';
// import startOfYear from 'date-fns/start_of_year';
// import endOfYear from 'date-fns/end_of_year';
// import subYears from 'date-fns/sub_years';
// import addDays from 'date-fns/add_days';

/**
 * 获取时间范围
 * @param type 类型，带 `-` 表示过去一个时间，若指定 `number` 表示天数
 * @param time 开始时间
 */
export function getTimeDistance(
  type:
    | 'today'
    | '-today'
    | 'week'
    | '-week'
    | 'month'
    | '-month'
    | 'year'
    | '-year'
    | number,
  time?: Date | string | number,
): [Date, Date] {
  time = parse(time || new Date());

  switch (type) {
    case 'today':
      return [time, time];
    case '-today':
      return [addDays(time, -1), time];
    case 'week':
      return [startOfWeek(time), endOfWeek(time)];
    case '-week':
      return [startOfWeek(subWeeks(time, 1)), endOfWeek(subWeeks(time, 1))];
    case 'month':
      return [startOfMonth(time), endOfMonth(time)];
    case '-month':
      return [startOfMonth(subMonths(time, 1)), endOfMonth(subMonths(time, 1))];
    case 'year':
      return [startOfYear(time), endOfYear(time)];
    case '-year':
      return [startOfYear(subYears(time, 1)), endOfYear(subYears(time, 1))];
    default:
      return type > 0
        ? [time, addDays(time, type)]
        : [addDays(time, type), time];
  }
}
