export interface SrTableData {
  caption: string;
  headers: string[];
  rows: (string | number)[][];
}

/** Visually hidden table with the chart's data (DESIGN §2.5 a11y, §4.2). */
export function SrDataTable({ caption, headers, rows }: SrTableData) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
