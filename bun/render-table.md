```ts

interface RenderTableProps {
  data: any;
  maxDepth?: number;
  currentDepth?: number;
}

export function RenderTable({
  data,
  maxDepth = 3,
  currentDepth = 0,
}: RenderTableProps) {
  if (currentDepth >= maxDepth) return <span>[Max depth reached]</span>;

  if (data === null || data === undefined) return <span>No data</span>;

  if (_.isString(data) || _.isNumber(data) || _.isBoolean(data)) {
    return (
      <Text lineClamp={1} maw={200}>
        {String(data)}
      </Text>
    );
  }

  if (_.isArray(data)) {
    if (data.length === 0) return <span>Empty array</span>;

    const allPrimitives = data.every(
      (item) => _.isString(item) || _.isNumber(item) || _.isBoolean(item)
    );

    if (allPrimitives) {
      return (
        <Table withColumnBorders withRowBorders withTableBorder>
          <Table.Tbody>
            {data.map((item, index) => (
              <Table.Tr key={`primitive-${index}`}>
                <Table.Td>
                  <Text lineClamp={1} maw={200}>
                    {String(item)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      );
    }

    const firstObject = data.find((item) => _.isPlainObject(item));
    if (firstObject) {
      const headers = Object.keys(firstObject);

      return (
        <Table withColumnBorders withRowBorders withTableBorder >
          <Table.Thead bg={"cyan.9"} c={"cyan.2"}>
            <Table.Tr>
              {headers.map((header) => (
                <Table.Th key={header}>{header}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((row, rowIndex) => (
              <Table.Tr key={`row-${rowIndex}`}>
                {headers.map((header) => (
                  <Table.Td key={`${rowIndex}-${header}`} >
                    <RenderTable
                      data={row?.[header]}
                      maxDepth={maxDepth}
                      currentDepth={currentDepth + 1}
                    />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      );
    }

    // Mixed array or nested array
    return (
      <Table withColumnBorders withRowBorders withTableBorder>
        <Table.Tbody>
          {data.map((item, index) => (
            <Table.Tr key={`mixed-${index}`}>
              <Table.Td>
                <RenderTable
                  data={item}
                  maxDepth={maxDepth}
                  currentDepth={currentDepth + 1}
                />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    );
  }

  if (_.isPlainObject(data)) {
    const entries = Object.entries(data);
    if (entries.length === 0) return <span>Empty object</span>;

    return (
      <Table withColumnBorders withRowBorders withTableBorder>
        <Table.Tbody>
          {entries.map(([key, value]) => (
            <Table.Tr key={key}>
              <Table.Td>{key}</Table.Td>
              <Table.Td>
                <RenderTable
                  data={value}
                  maxDepth={maxDepth}
                  currentDepth={currentDepth + 1}
                />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    );
  }

  return <Text bg={"blue"}>{String(data)}</Text>;
}

```
