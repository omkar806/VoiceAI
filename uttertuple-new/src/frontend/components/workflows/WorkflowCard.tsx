import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Edit, Trash2, GitBranch, ChevronRight, Play } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import workflowService from '@/services/workflow';
import { storeWorkflowJson } from '@/utils/workflowStorage';
import { toast } from 'react-hot-toast';


// Animation styles
const animationStyles = `
 @keyframes pulse {
   0% {
     transform: scale(0.95);
     box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7);
   }
  
   70% {
     transform: scale(1);
     box-shadow: 0 0 0 6px rgba(52, 211, 153, 0);
   }
  
   100% {
     transform: scale(0.95);
     box-shadow: 0 0 0 0 rgba(52, 211, 153, 0);
   }
 }
  @keyframes glowPulse {
   0% {
     box-shadow: 0 0 5px 0px rgba(52, 211, 153, 0.7);
   }
   50% {
     box-shadow: 0 0 10px 3px rgba(52, 211, 153, 0.5);
   }
   100% {
     box-shadow: 0 0 5px 0px rgba(52, 211, 153, 0.7);
   }
 }
  .animate-status-pulse {
   animation: pulse 2s infinite;
 }
  .animate-glow-pulse {
   animation: glowPulse 2s infinite;
 }
`;


interface WorkflowCardProps {
 workflow: any; // Using any for now as the Workflow type might vary
 onDelete: (workflow: any, e: React.MouseEvent) => void;
 onTerminate?: (workflowId: string, e: React.MouseEvent) => void;
}


const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, onDelete, onTerminate }) => {
 const { darkMode } = useTheme();
 const [hovered, setHovered] = React.useState(false);
 const [runLoading, setRunLoading] = React.useState(false);
 const router = useRouter();


 // Generate a background gradient based on workflow name
 const getGradientColors = () => {
   // Use the workflow name to generate a consistent gradient
   const hash = workflow.name.split('').reduce((acc: number, char: string) => char.charCodeAt(0) + acc, 0);
  
   // Define gradient palette options
   const palettes = [
     ['from-indigo-500 to-blue-600', 'rgba(99, 102, 241, 0.8)', 'rgba(37, 99, 235, 0.9)'],
     ['from-purple-500 to-indigo-600', 'rgba(168, 85, 247, 0.8)', 'rgba(79, 70, 229, 0.9)'],
     ['from-emerald-500 to-teal-600', 'rgba(16, 185, 129, 0.8)', 'rgba(13, 148, 136, 0.9)'],
     ['from-blue-500 to-violet-600', 'rgba(59, 130, 246, 0.8)', 'rgba(124, 58, 237, 0.9)'],
     ['from-cyan-500 to-blue-600', 'rgba(6, 182, 212, 0.8)', 'rgba(37, 99, 235, 0.9)'],
   ];
  
   return palettes[hash % palettes.length];
 };
  const [gradientClass, startColor, endColor] = getGradientColors();

 // Handle run workflow button click
 const handleRunWorkflow = async (e: React.MouseEvent) => {
   e.preventDefault();
   e.stopPropagation();
   
   setRunLoading(true);
   try {
     // Generate workflow JSON from the database
     const workflowJson = await workflowService.generateWorkflowJsonFromDb(workflow.id);
     
     // Store the workflow JSON in session storage
     storeWorkflowJson(workflow.id, workflowJson);
     
     // Navigate to the run workflow page with only the workflowId
     router.push(`/runworkflow?workflowId=${workflow.id}`);
   } catch (err) {
     console.error('Error preparing workflow execution:', err);
     toast.error('Failed to prepare workflow for execution');
   } finally {
     setRunLoading(false);
   }
 };

 return (
   <>
     <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       whileHover={{
         y: -5,
         transition: { duration: 0.3, ease: 'easeOut' }
       }}
       onHoverStart={() => {
         setHovered(true);
         router.prefetch(`/workflows/${workflow.id}/edit`);
       }}
       onHoverEnd={() => setHovered(false)}
       onClick={() => router.push(`/workflows/${workflow.id}/edit`)}
       className={`relative overflow-hidden rounded-xl shadow-sm transition-all duration-300 cursor-pointer ${
         darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
       } ${hovered ? 'shadow-md' : ''} ${
         workflow.processStatus?.status === 'running' && workflow.processStatus?.is_workflow_subprocess
           ? darkMode ? 'dark-glow-pulse' : 'animate-glow-pulse'
           : ''
       }`}
     >
       {/* Gradient accent at top */}
       <div
         className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${gradientClass}`}
       />
      
       {/* Subtle glow effect */}
       <div
         className="absolute -top-10 -right-10 w-20 h-20 rounded-full opacity-10 blur-xl"
         style={{
           background: `radial-gradient(circle, ${startColor} 0%, ${endColor} 100%)`,
           filter: 'blur(25px)',
         }}
       />

       {/* Run button in top-right corner */}
       <button
         onClick={handleRunWorkflow}
         className={`absolute top-3 right-3 p-2 rounded-full ${
           darkMode 
             ? 'bg-green-700/80 text-white hover:bg-green-600' 
             : 'bg-green-600 text-white hover:bg-green-500'
         } transition-all z-20 ${runLoading ? 'opacity-70 cursor-wait' : ''}`}
         title="Run Workflow"
         disabled={runLoading}
       >
         {runLoading ? (
           <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
         ) : (
           <Play className="w-4 h-4" />
         )}
       </button>

       <div className="p-5 cursor-pointer relative z-10">
         <div className="flex justify-between items-start mb-4">
           <div className="flex items-center">
             <h3
               className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}
             >
               {workflow.name}
             </h3>
            
             {/* Status badge */}
             {workflow.processStatus && (
               <div className={`ml-2 flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                 workflow.processStatus.status === 'running' && workflow.processStatus.is_workflow_subprocess
                   ? darkMode
                     ? 'bg-green-900/30 text-green-400 ring-1 ring-green-700/50'
                     : 'bg-green-100 text-green-800 ring-1 ring-green-200'
                   : workflow.processStatus.status === 'not_workflow'
                   ? darkMode
                     ? 'bg-yellow-900/30 text-yellow-400 ring-1 ring-yellow-700/50'
                     : 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200'
                   : darkMode
                     ? 'bg-red-900/30 text-red-400 ring-1 ring-red-700/50'
                     : 'bg-red-100 text-red-800 ring-1 ring-red-200'
               }`}>
                 <div className={`w-2 h-2 rounded-full mr-1.5 ${
                   workflow.processStatus.status === 'running' && workflow.processStatus.is_workflow_subprocess
                     ? 'bg-green-500 animate-status-pulse'
                     : workflow.processStatus.status === 'not_workflow'
                     ? 'bg-yellow-500'
                     : 'bg-red-500'
                 }`}></div>
                 {workflow.processStatus.status === 'running' && workflow.processStatus.is_workflow_subprocess
                   ? 'Active'
                   : workflow.processStatus.status === 'not_workflow'
                   ? 'Unknown'
                   : 'Inactive'}
               </div>
             )}
           </div>
         </div>
        
         <div className={`p-3 ${
           darkMode
             ? 'bg-gray-700 border-gray-600'
             : 'bg-neutral-50 border-neutral-100'
         } rounded-md border mb-4`}>
           <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-neutral-700'} flex items-center`}>
             <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full mr-2"></span>
             <span className="font-medium">Agents:</span> {workflow.nodes?.filter((node: any) => node.node_type === "agent").length || 0}
           </p>
         </div>
        
         <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-neutral-500'} flex items-center`}>
           <span className="w-2 h-2 bg-blue-400 rounded-full mr-1.5 opacity-70"></span>
           Last modified: {new Date(workflow.updated_at).toLocaleDateString()}
         </p>
        
         {workflow.processStatus && workflow.processStatus.status === 'running' && workflow.processStatus.is_workflow_subprocess && (
           <div className={`mt-3 p-2 ${
             darkMode
               ? 'bg-green-900/20 border-green-800/30'
               : 'bg-green-50 border-green-100'
           } border rounded-md inline-flex items-center shadow-sm`}>
             <div className="mr-1.5 w-2 h-2 bg-green-500 rounded-full animate-status-pulse"></div>
             <p className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-700'} font-medium`}>
               Process running (PID: {workflow.processStatus.process_id})
             </p>
           </div>
         )}
       </div>


       {/* Action buttons - New Layout matching AgentCard */}
       <div className={`flex border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`} onClick={(e) => e.stopPropagation()}>
         <Link
           href={`/workflows/${workflow.id}/edit`}
           className={`flex-1 text-center py-3 text-sm font-medium flex items-center justify-center ${
             darkMode
               ? 'text-blue-400 hover:bg-blue-900/20'
               : 'text-blue-600 hover:bg-blue-50'
           } transition-colors`}
         >
           <Edit className="w-4 h-4 mr-1.5" />
           Edit
         </Link>
         <div
           className={`w-px h-10 self-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
         ></div>
         <button
           onClick={(e) => { e.stopPropagation(); onDelete(workflow, e); }}
           className={`flex-1 text-center py-3 text-sm font-medium flex items-center justify-center ${
             darkMode
               ? 'text-gray-300 hover:bg-gray-700/50'
               : 'text-gray-600 hover:bg-gray-50'
           } transition-colors`}
         >
           <Trash2 className="w-4 h-4 mr-1.5" />
           Delete
         </button>
       </div>
     </motion.div>
   </>
 );
};


export default WorkflowCard;

