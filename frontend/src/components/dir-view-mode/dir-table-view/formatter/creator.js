import { useCollaborators } from '@/metadata';
import CreatorFormatter from '@/metadata/components/cell-formatter/creator';

const Creator = ({ value, record }) => {
  const { queryUser, collaborators, collaboratorsCache, updateCollaboratorsCache } = useCollaborators();
  return (
    <CreatorFormatter
      key={record._id}
      className="dir-table-creator-formatter"
      value={value}
      api={queryUser}
      collaborators={collaborators}
      collaboratorsCache={collaboratorsCache}
      updateCollaboratorsCache={updateCollaboratorsCache}
    />
  );
};

export default Creator;
