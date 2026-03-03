import { useParams } from "react-router-dom";
import DocumentForm from "./DocumentForm";
import { useTemplates } from "../hooks/useTemplates";

export default function GenerateDocument() {
	const { templateId } = useParams();
	const { templates, loading } = useTemplates();

	const template = templates.find((t) => t.id === templateId);

	if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
	if (!template) return <p className="text-sm text-red-500">Template not found</p>;

	return <DocumentForm template={template} />;
}