'use client';

import { ProjectTile } from '../projects/project-tile';
import type { Activity, Project } from '../../lib/planning/types';

export function ProjectCard({ p, activities }: { p: Project; activities: Activity[] }) {
  return <ProjectTile project={p} activities={activities}/>;
}
