import { createContext, useContext } from 'react';

const WorkflowContext = createContext();
export const WorkflowProvider = ({ children }) => {
  // const [] = useState();

  return (
    <WorkflowContext.Provider value={{

    }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflows = () => {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error('\'WorkflowContext\' is null');
  return context;
};
