import ResearchStudyDetail from '@/components/research-studies/ResearchStudyDetail';

interface RouteParams {
  id?: string | string[];
}

export default function ResearchStudyPage({ params }: { params: RouteParams }) {
  const identifierParam = params?.id;
  const identifier = Array.isArray(identifierParam) ? identifierParam[0] : identifierParam;

  return <ResearchStudyDetail initialIdentifier={identifier ?? ''} />;
}
