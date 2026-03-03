import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

const UpsertAccountPage: React.FC = () => {
  const { id } = useParams();

  if (id) {
    return <Navigate to={`/accounts?action=edit&id=${id}`} replace />;
  }
  return <Navigate to="/accounts?action=new" replace />;
};

export default UpsertAccountPage;
