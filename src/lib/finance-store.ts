import { FinanceProject, YearlyTarget } from "./finance-types";

const PROJECTS_KEY = "finance_projects";
const TARGET_KEY = "finance_yearly_target";

export function getProjects(): FinanceProject[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROJECTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveProjects(projects: FinanceProject[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function addProject(project: FinanceProject) {
  const projects = getProjects();
  projects.push(project);
  saveProjects(projects);
}

export function updateProject(updated: FinanceProject) {
  const projects = getProjects().map((p) =>
    p.id === updated.id ? updated : p
  );
  saveProjects(projects);
}

export function deleteProject(id: string) {
  const projects = getProjects().filter((p) => p.id !== id);
  saveProjects(projects);
}

export function getYearlyTarget(): YearlyTarget | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TARGET_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveYearlyTarget(target: YearlyTarget) {
  localStorage.setItem(TARGET_KEY, JSON.stringify(target));
}
