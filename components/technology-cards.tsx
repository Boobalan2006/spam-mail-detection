import { Brain, Database, FileCode, LineChart } from "lucide-react"

export function TechnologyCards() {
  const technologies = [
    {
      title: "ML Algorithms",
      description: "Multinomial Naive Bayes and Logistic Regression models for accurate spam classification.",
      icon: Brain,
    },
    {
      title: "Vectorization",
      description: "TF-IDF (Term Frequency-Inverse Document Frequency) for text feature extraction.",
      icon: FileCode,
    },
    {
      title: "Explainability",
      description: "SHAP (SHapley Additive exPlanations) and LIME for transparent model decisions.",
      icon: LineChart,
    },
    {
      title: "Data Processing",
      description: "scikit-learn, pandas, and NLTK for data preprocessing and model training.",
      icon: Database,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {technologies.map((tech) => (
        <div
          key={tech.title}
          className="flex flex-col space-y-2 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-indigo-100 text-indigo-700">
              <tech.icon className="h-5 w-5" />
            </div>
            <h3 className="font-medium">{tech.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{tech.description}</p>
        </div>
      ))}
    </div>
  )
}
