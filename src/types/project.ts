export interface ProjectInput {
  name: string;
  categories: string[];
}

export interface ClientProject extends ProjectInput {
  id: string;
  clientId: string;
}

export function projectVariant(count: number) {
  return count === 1 ? "one" : count === 2 ? "two" : count === 3 ? "three" : "multiple";
}

export function loadProjects(clientId: string): ClientProject[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(`keppler.projects.${clientId}`) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter((project): project is ClientProject =>
      project !== null && typeof project === "object" &&
      typeof project.id === "string" && project.clientId === clientId &&
      typeof project.name === "string" && Array.isArray(project.categories) &&
      project.categories.length > 0 &&
      project.categories.every((category: unknown) => typeof category === "string")
    );
  } catch {
    return [];
  }
}

export function saveProject(project: ClientProject): ClientProject[] {
  const projects = [...loadProjects(project.clientId), project];
  localStorage.setItem(`keppler.projects.${project.clientId}`, JSON.stringify(projects));
  return projects;
}
