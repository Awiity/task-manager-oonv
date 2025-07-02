export interface SortStrategy {
  sort(tasks: any[]): any[];
}

export class PrioritySort implements SortStrategy {
  sort(tasks: any[]) {
    const priorityMap = { High: 1, Medium: 2, Low: 3 };
    return [...tasks].sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]);
  }
}
