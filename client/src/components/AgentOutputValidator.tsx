import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, RefreshCw, ChevronDown, Code, Wand2 } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ValidationError {
  path: string;
  message: string;
  expected: string;
  received: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface AgentOutputValidatorProps {
  output: string;
  schema?: { type: string; properties?: Record<string, { type: string; required?: boolean; description?: string }> };
  validationResult?: ValidationResult;
  onValidate: (output: string, schema: object) => void;
  onFix: (error: { path: string }) => void;
}

const OutputDisplay: React.FC<{ content: string; highlightedLine?: number }> = ({ content, highlightedLine }) => {
  const lines = useMemo(() => content.split('\n'), [content]);

  return (
    <div className="bg-background rounded-md text-sm font-mono overflow-auto h-full">
      <div className="flex">
        <div className="text-right text-muted-foreground pr-4 select-none sticky top-0 bg-background z-10 pt-4">
          {lines.map((_, i) => (
            <div key={i} className={cn("h-[20px]", i + 1 === highlightedLine ? "text-primary" : "")}>{i + 1}</div>
          ))}
        </div>
        <pre className="flex-1 pt-4 pb-4 pr-4 whitespace-pre-wrap break-all"><code className="block">
          {lines.map((line, i) => (
            <div key={i} className={cn("h-[20px]", i + 1 === highlightedLine ? "bg-primary/10 rounded-sm" : "")}>{line}</div>
          ))}
        </code></pre>
      </div>
    </div>
  );
};

export const AgentOutputValidator: React.FC<AgentOutputValidatorProps> = ({
  output,
  schema,
  validationResult,
  onValidate,
  onFix,
}) => {
  const [isFormatted, setIsFormatted] = useState(true);
  const [selectedError, setSelectedError] = useState<ValidationError | null>(null);
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);

  const formattedOutput = useMemo(() => {
    if (!isFormatted) return output;
    try {
      const parsed = JSON.parse(output);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return output; // Return original if not valid JSON
    }
  }, [output, isFormatted]);

  const handleRevalidate = useCallback(() => {
    if (schema) {
      onValidate(output, schema);
    }
  }, [output, schema, onValidate]);

  const getLineForPath = (jsonString: string, path: string): number | undefined => {
    const lines = jsonString.split('\n');
    const pathParts = path.split('.').slice(1); // Remove "root"
    let searchKey = pathParts[pathParts.length - 1];
    if (!searchKey) return undefined;

    // simple search for key, might not be perfect for complex objects
    const regex = new RegExp(`"${searchKey}"\s*:`);
    const lineIndex = lines.findIndex(line => regex.test(line));

    return lineIndex !== -1 ? lineIndex + 1 : undefined;
  };

  const highlightedLine = useMemo(() => {
    if (!selectedError) return undefined;
    return getLineForPath(formattedOutput, selectedError.path);
  }, [selectedError, formattedOutput]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full w-full">
      <Card className="flex flex-col h-full">
        <CardHeader className="flex-row items-center justify-between p-4">
          <CardTitle className="text-lg">Agent Output</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsFormatted(!isFormatted)} title={isFormatted ? "Show Raw" : "Format JSON"}>
              <Code className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0 flex-1 overflow-hidden">
          <OutputDisplay content={formattedOutput} highlightedLine={highlightedLine} />
        </CardContent>
      </Card>

      <Card className="flex flex-col h-full">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Validation</CardTitle>
            {validationResult && (
              <Badge variant={validationResult.isValid ? "secondary" : "destructive"} className="flex items-center gap-1.5">
                {validationResult.isValid ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                {validationResult.isValid ? "Valid" : "Invalid"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-4 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Actions</p>
              <Button onClick={handleRevalidate} disabled={!schema} size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-validate
              </Button>
            </div>

            {schema && (
              <Collapsible open={isSchemaOpen} onOpenChange={setIsSchemaOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span>Schema Definition</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isSchemaOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <pre className="bg-background p-3 rounded-md text-xs font-mono overflow-auto">
                    {JSON.stringify(schema, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-2">Results</h3>
              {validationResult ? (
                !validationResult.isValid && validationResult.errors.length > 0 ? (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {validationResult.errors.map((error, index) => (
                        <motion.div
                          key={error.path + index}
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className={cn(
                            "border p-3 rounded-lg cursor-pointer hover:border-primary/50",
                            selectedError?.path === error.path ? "border-primary bg-primary/5" : "border-border"
                          )}
                          onClick={() => setSelectedError(error)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-sm text-destructive">{error.message}</p>
                              <p className="text-xs text-muted-foreground font-mono mt-1">{error.path}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onFix({ path: error.path }); }}>
                              <Wand2 className="mr-2 h-4 w-4" />
                              Fix
                            </Button>
                          </div>
                          <Separator className="my-2" />
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="font-medium text-muted-foreground">Expected</p>
                              <p className="font-mono text-foreground break-all">{error.expected}</p>
                            </div>
                            <div>
                              <p className="font-medium text-muted-foreground">Received</p>
                              <p className="font-mono text-destructive break-all">{error.received}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    {validationResult.isValid ? "No validation errors found." : "No validation results available."}
                  </div>
                )
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Click "Re-validate" to check the output against the schema.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
