"use client"
import React, { JSX, useEffect, useState } from 'react';
import { Survey } from "survey-react-ui";
import "survey-core/survey-core.css";
import { useRouter } from 'next/navigation';
import surveyJson from './chemical-survey.json';

// Proper type definitions to avoid using 'any'
interface SurveyData {
  [key: string]: unknown;
}

interface SurveyCompletionEvent {
  data: SurveyData;
}

interface SurveyOnComplete {
  add: (callback: (sender: SurveyCompletionEvent) => void) => void;
}

interface SurveyModelType {
  onComplete: SurveyOnComplete;
  // Add other properties as needed
}

// Use dynamic import with proper typing
export default function Page(): JSX.Element {
  const router = useRouter();
  const [model, setModel] = useState<SurveyModelType | null>(null);
  
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;
    
    let isComponentMounted = true;
    
    // Function to initialize survey
    const initSurvey = async (): Promise<void> => {
      try {
        // Dynamically import survey-core
        // Using 'as' for the import since we know the structure
        const surveyCore = await import('survey-core');
        const ModelConstructor = surveyCore.Model as new (json: unknown) => SurveyModelType;
        
        // Create model instance
        const surveyModel = new ModelConstructor(surveyJson);
        
        // Add completion handler
        surveyModel.onComplete.add((sender: SurveyCompletionEvent) => {
          localStorage.setItem('surveyResults', JSON.stringify(sender.data));
          router.push('/chemical-compliance/result');
        });
        
        // Only update state if component is still mounted
        if (isComponentMounted) {
          setModel(surveyModel);
        }
      } catch (error) {
        // Type-safe error handling
        console.error("Failed to load survey model:", 
          error instanceof Error ? error.message : "Unknown error");
      }
    };
    
    initSurvey();
    
    // Cleanup function
    return () => {
      isComponentMounted = false;
    };
  }, [router]);
  
  return (
    <div className="container mx-auto p-4">
      {model ? (
        <Survey model={model} />
      ) : (
        <div className="text-center p-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2">Loading survey...</p>
        </div>
      )}
    </div>
  );
}

