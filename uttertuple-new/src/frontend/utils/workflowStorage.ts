/**
 * Utility for securely storing workflow data in session storage during page navigation
 * Session storage is cleared when the user closes the browser tab, making it more secure than
 * passing sensitive data in URL parameters
 */

// Keys for storing workflow data
const WORKFLOW_JSON_KEY = 'TEMP_WORKFLOW_JSON';

// Store workflow JSON data temporarily
export const storeWorkflowJson = (workflowId: string, workflowJson: any): void => {
  try {
    // Create a storage item with workflowId as part of the key for added security
    const storageKey = `${WORKFLOW_JSON_KEY}_${workflowId}`;
    
    // Store the data in sessionStorage (cleared when tab is closed)
    sessionStorage.setItem(storageKey, JSON.stringify(workflowJson));
    
    // Set expiration for added security (15 minutes)
    const expiration = Date.now() + (15 * 60 * 1000);
    sessionStorage.setItem(`${storageKey}_expiration`, expiration.toString());
  } catch (error) {
    console.error('Error storing workflow JSON:', error);
  }
};

// Retrieve workflow JSON data
export const getWorkflowJson = (workflowId: string): any | undefined => {
  try {
    const storageKey = `${WORKFLOW_JSON_KEY}_${workflowId}`;
    
    // Check if data has expired
    const expiration = sessionStorage.getItem(`${storageKey}_expiration`);
    if (!expiration || parseInt(expiration) < Date.now()) {
      // Clear expired data
      clearWorkflowJson(workflowId);
      return undefined;
    }
    
    // Get data from sessionStorage
    const storedData = sessionStorage.getItem(storageKey);
    if (!storedData) return undefined;
    
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error retrieving workflow JSON:', error);
    return undefined;
  }
};

// Clear workflow JSON data after it has been used
export const clearWorkflowJson = (workflowId: string): void => {
  try {
    const storageKey = `${WORKFLOW_JSON_KEY}_${workflowId}`;
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem(`${storageKey}_expiration`);
  } catch (error) {
    console.error('Error clearing workflow JSON:', error);
  }
}; 