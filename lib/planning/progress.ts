import type { Activity, Project } from './types';

export const progress = (project: Project, activities: Activity[]) => {
  const projectActivities = activities.filter((activity) => activity.project_id === project.id);
  return projectActivities.length
    ? Math.round(
        (projectActivities.filter((activity) => activity.status === 'completed').length /
          projectActivities.length) *
          100,
      )
    : 0;
};
