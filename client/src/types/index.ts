export type UserRole = "Admin" | "Project Manager" | "Employee";

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
  projectsCount?: number;
  tasksCount?: number;
  completedTasksCount?: number;
  progress?: number;
}

export type ProjectStatus = "Active" | "Completed" | "Archived";

export interface Project {
  _id: string;
  id?: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate?: string;
  deadline?: string;
  projectManager: User;
  assignedEmployees: User[];
  createdBy: User;
  totalTasks?: number;
  completedTasks?: number;
  progress?: number;
  tasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = "Low" | "Medium" | "High" | "Critical";
export type TaskStatus = "To Do" | "In Progress" | "Review" | "Done";

export interface Task {
  _id: string;
  id?: string;
  title: string;
  description: string;
  project: {
    _id: string;
    name: string;
    status: ProjectStatus;
  };
  assignee?: User;
  createdBy: User;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  task: string;
  author: User;
  content: string;
  createdAt: string;
}

export interface Activity {
  _id: string;
  actor: User;
  action: string;
  relatedResourceType: "Project" | "Task" | "User" | "Comment";
  relatedResourceId?: string;
  summary: string;
  createdAt: string;
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  archivedProjects?: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  todoTasks?: number;
  reviewTasks?: number;
  overdueTasks: number;
  completionRate: number;
  totalTeamMembers?: number;
}

export interface ChartDataPoint {
  name?: string;
  priority?: string;
  count: number;
  color?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  charts: {
    statusData: ChartDataPoint[];
    priorityData: ChartDataPoint[];
  };
  recentActivity: Activity[];
  upcomingDeadlines: Task[];
}
