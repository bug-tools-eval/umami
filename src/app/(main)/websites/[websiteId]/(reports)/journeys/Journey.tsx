import { Column, Focusable, Icon, Row, Text, Tooltip, TooltipTrigger } from '@umami/react-zen';
import classNames from 'classnames';
import { useMemo, useState } from 'react';
import { firstBy } from 'thenby';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useEscapeKey, useMessages, useResultQuery } from '@/components/hooks';
import { File } from '@/components/icons';
import { Lightning } from '@/components/svg';
import { objectToArray } from '@/lib/data';
import { formatLongNumber } from '@/lib/format';
import styles from './Journey.module.css';

const NODE_HEIGHT = 60;
const NODE_GAP = 10;
const LINE_WIDTH = 3;

export interface JourneyProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  steps: number;
  startStep?: string;
  endStep?: string;
  view: string;
}

const EVENT_TYPES = {
  views: 1,
  events: 2,
};

export function Journey({ websiteId, steps, startStep, endStep, view }: JourneyProps) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeNode, setActiveNode] = useState(null);
  const { t, labels } = useMessages();
  const { data, error, isLoading } = useResultQuery<any>('journey', {
    websiteId,
    steps,
    startStep,
    endStep,
    view,
    eventType: EVENT_TYPES[view],
  });

  useEscapeKey(() => setSelectedNode(null));

  const columns = useMemo(() => {
    if (!data) {
      return [];
    }

    const selectedPaths = selectedNode?.paths ?? [];
    const activePaths = activeNode?.paths ?? [];
    const columns = [];
    const selectedNames = getColumnNames(selectedPaths, +steps);
    const activeNames = getColumnNames(activePaths, +steps);
    const selectedTransitions = getTransitionCounts(selectedPaths, +steps);
    const activeTransitions = getTransitionKeys(activePaths, +steps);

    for (let columnIndex = 0; columnIndex < +steps; columnIndex++) {
      const nodes = {};

      data.forEach(({ items, count }: any, nodeIndex: any) => {
        const name = items[columnIndex];

        if (name) {
          if (!nodes[name]) {
            const selected = selectedNames[columnIndex]?.has(name);
            const active = selected && activeNames[columnIndex]?.has(name);

            nodes[name] = {
              name,
              totalCount: 0,
              nodeIndex,
              columnIndex,
              selected,
              active,
              paths: [],
            };
          }

          nodes[name].totalCount += count;
          nodes[name].paths.push({ items, count });
        }
      });

      columns.push({
        nodes: objectToArray(nodes).sort(firstBy('totalCount', -1)),
      });
    }

    columns.forEach((column, columnIndex) => {
      const nodes = column.nodes.map(
        (
          currentNode: { totalCount: number; name: string; selected: boolean },
          currentNodeIndex: any,
        ) => {
          const previousNodes = columns[columnIndex - 1]?.nodes;
          let selectedCount = previousNodes ? 0 : currentNode.totalCount;
          let activeCount = selectedCount;

          const lines =
            previousNodes?.reduce((arr: any[][], previousNode: any, previousNodeIndex: number) => {
              const transition = getTransitionKey(columnIndex, previousNode.name, currentNode.name);
              const fromCount = selectedTransitions.get(transition) || 0;

              if (currentNode.selected && previousNode.selected && fromCount) {
                arr.push([
                  previousNodeIndex,
                  currentNodeIndex,
                  activeNode ? activeTransitions.has(transition) : false,
                ]);
                selectedCount += fromCount;

                if (previousNode.active) {
                  activeCount += fromCount;
                }
              }

              return arr;
            }, []) || [];

          return { ...currentNode, selectedCount, activeCount, lines };
        },
      );

      const visitorCount = nodes.reduce(
        (sum: number, { selected, selectedCount, active, activeCount, totalCount }) => {
          if (!selectedNode) {
            sum += totalCount;
          } else if (!activeNode && selectedNode && selected) {
            sum += selectedCount;
          } else if (activeNode && active) {
            sum += activeCount;
          }
          return sum;
        },
        0,
      );

      const previousTotal = columns[columnIndex - 1]?.visitorCount ?? 0;
      const dropOff =
        previousTotal > 0 ? ((visitorCount - previousTotal) / previousTotal) * 100 : 0;

      Object.assign(column, { nodes, visitorCount, dropOff });
    });

    return columns;
  }, [data, selectedNode, activeNode, steps]);

  const handleClick = (name: string, columnIndex: number, paths: any[]) => {
    if (name !== selectedNode?.name || columnIndex !== selectedNode?.columnIndex) {
      setSelectedNode({ name, columnIndex, paths });
    } else {
      setSelectedNode(null);
    }
    setActiveNode(null);
  };

  return (
    <LoadingPanel data={data} isLoading={isLoading} error={error} height="100%">
      <div className={styles.container}>
        <div className={styles.view}>
          {columns.map(({ visitorCount, nodes }, columnIndex) => {
            return (
              <div
                key={columnIndex}
                className={classNames(styles.column, {
                  [styles.selected]: selectedNode,
                  [styles.active]: activeNode,
                })}
              >
                <div className={styles.header}>
                  <div className={styles.num}>{columnIndex + 1}</div>
                  <div className={styles.stats}>
                    <div className={styles.visitors} title={visitorCount}>
                      {formatLongNumber(visitorCount)} {t(labels.visitors)}
                    </div>
                  </div>
                </div>
                <div className={styles.nodes}>
                  {nodes.map(
                    ({
                      name,
                      totalCount,
                      selected,
                      active,
                      paths,
                      activeCount,
                      selectedCount,
                      lines,
                    }) => {
                      const nodeCount = selected
                        ? active
                          ? activeCount
                          : selectedCount
                        : totalCount;

                      const remaining =
                        columnIndex > 0
                          ? Math.round((nodeCount / columns[columnIndex - 1]?.visitorCount) * 100)
                          : 0;

                      const dropped = 100 - remaining;

                      return (
                        <div
                          key={name}
                          className={styles.wrapper}
                          onMouseEnter={() =>
                            selected && setActiveNode({ name, columnIndex, paths })
                          }
                          onMouseLeave={() => selected && setActiveNode(null)}
                        >
                          <div
                            className={classNames(styles.node, {
                              [styles.selected]: selected,
                              [styles.active]: active,
                            })}
                            onClick={() => handleClick(name, columnIndex, paths)}
                          >
                            <Row alignItems="center" className={styles.name} title={name} gap>
                              <Icon>{name.startsWith('/') ? <File /> : <Lightning />}</Icon>
                              <Text truncate>{name}</Text>
                            </Row>
                            <div className={styles.count} title={nodeCount}>
                              <TooltipTrigger
                                delay={0}
                                isDisabled={columnIndex === 0 || (selectedNode && !selected)}
                              >
                                <Focusable>
                                  <div>{formatLongNumber(nodeCount)}</div>
                                </Focusable>
                                <Tooltip placement="top" offset={20} showArrow>
                                  <Text transform="lowercase" color="red">
                                    {`${dropped}% ${t(labels.dropoff)}`}
                                  </Text>
                                  <Column>
                                    <Text transform="lowercase">
                                      {`${remaining}% ${t(labels.conversion)}`}
                                    </Text>
                                  </Column>
                                </Tooltip>
                              </TooltipTrigger>
                            </div>
                            {columnIndex < columns.length &&
                              lines.map(([fromIndex, nodeIndex, isActive], i) => {
                                const height =
                                  (Math.abs(nodeIndex - fromIndex) + 1) * (NODE_HEIGHT + NODE_GAP) -
                                  NODE_GAP;
                                const midHeight =
                                  (Math.abs(nodeIndex - fromIndex) - 1) * (NODE_HEIGHT + NODE_GAP) +
                                  NODE_GAP +
                                  LINE_WIDTH;

                                return (
                                  <div
                                    key={`${fromIndex}${nodeIndex}${i}`}
                                    className={classNames(styles.line, {
                                      [styles.active]: active && isActive,
                                      [styles.up]: fromIndex < nodeIndex,
                                      [styles.down]: fromIndex > nodeIndex,
                                      [styles.flat]: fromIndex === nodeIndex,
                                    })}
                                    style={{ height }}
                                  >
                                    <div className={classNames(styles.segment, styles.start)} />
                                    <div
                                      className={classNames(styles.segment, styles.mid)}
                                      style={{
                                        height: midHeight,
                                      }}
                                    />
                                    <div className={classNames(styles.segment, styles.end)} />
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </LoadingPanel>
  );
}

function getColumnNames(paths: any[], steps: number) {
  const names = Array.from({ length: steps }, () => new Set<string>());

  paths.forEach(({ items }) => {
    for (let index = 0; index < steps; index++) {
      if (items[index]) {
        names[index].add(items[index]);
      }
    }
  });

  return names;
}

function getTransitionCounts(paths: any[], steps: number) {
  const counts = new Map<string, number>();

  paths.forEach(({ items, count }) => {
    for (let index = 1; index < steps; index++) {
      if (!items[index - 1] || !items[index]) {
        continue;
      }

      const key = getTransitionKey(index, items[index - 1], items[index]);

      counts.set(key, (counts.get(key) || 0) + count);
    }
  });

  return counts;
}

function getTransitionKeys(paths: any[], steps: number) {
  const keys = new Set<string>();

  paths.forEach(({ items }) => {
    for (let index = 1; index < steps; index++) {
      if (!items[index - 1] || !items[index]) {
        continue;
      }

      keys.add(getTransitionKey(index, items[index - 1], items[index]));
    }
  });

  return keys;
}

function getTransitionKey(columnIndex: number, from: string, to: string) {
  return `${columnIndex}:${from}:${to}`;
}
