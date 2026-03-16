'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import WorkflowEditor from '../[id]/page';

export default function NewWorkflowPage() {
  // This page serves as a clean URL for creating new workflows
  // It simply renders the workflow editor with no ID
  return <WorkflowEditor />;
} 