"use client";

import { useState } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Database, Code, FileText, Layout, Wand2 } from "lucide-react";
import { generateDatabaseSchema } from "@/ai/flows/generate-database-schema";
import { generateBackendProjectStructure } from "@/ai/flows/generate-backend-project-structure";
import { generateBackendApiBoilerplate } from "@/ai/flows/generate-backend-api-boilerplate";
import { useLanguage } from "@/lib/i18n/context";

export default function SystemGenPage() {
  const [loading, setLoading] = useState(false);
  const [requirements, setRequirements] = useState("");
  const [results, setResults] = useState<any>(null);
  const { t } = useLanguage();

  const handleGenerate = async () => {
    if (!requirements) return;
    setLoading(true);
    try {
      const [dbSchema, structure, api] = await Promise.all([
        generateDatabaseSchema({ requirements }),
        generateBackendProjectStructure({ projectName: "OmniStock" }),
        generateBackendApiBoilerplate({}),
      ]);

      setResults({
        db: dbSchema,
        structure: structure,
        api: api,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">{t.systemGen.title}</h1>
          <p className="text-muted-foreground mt-1">{t.systemGen.description}</p>
        </header>

        <Card className="mb-8 border-none shadow-sm bg-primary/5">
          <CardHeader>
            <CardTitle className="font-headline">{t.systemGen.inputReqs}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="..."
              className="min-h-[150px] bg-card font-body"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
            <Button 
              className="w-full h-12 gap-2 text-lg" 
              onClick={handleGenerate} 
              disabled={loading || !requirements}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              {t.systemGen.generate}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Tabs defaultValue="db" className="w-full">
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="db" className="gap-2"><Database className="w-4 h-4" /> {t.systemGen.database}</TabsTrigger>
                <TabsTrigger value="structure" className="gap-2"><Layout className="w-4 h-4" /> {t.systemGen.structure}</TabsTrigger>
                <TabsTrigger value="api" className="gap-2"><Code className="w-4 h-4" /> {t.systemGen.apiBoilerplate}</TabsTrigger>
                <TabsTrigger value="endpoints" className="gap-2"><FileText className="w-4 h-4" /> {t.systemGen.endpoints}</TabsTrigger>
              </TabsList>

              <TabsContent value="db">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-none shadow-sm">
                    <CardHeader><CardTitle className="text-sm uppercase text-muted-foreground font-headline tracking-wider">PostgreSQL Schema</CardTitle></CardHeader>
                    <CardContent>
                      <pre className="bg-muted p-4 rounded-lg text-xs font-code overflow-x-auto whitespace-pre-wrap max-h-[500px]">
                        {results.db.postgresqlSchema}
                      </pre>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm">
                    <CardHeader><CardTitle className="text-sm uppercase text-muted-foreground font-headline tracking-wider">Prisma Model</CardTitle></CardHeader>
                    <CardContent>
                      <pre className="bg-muted p-4 rounded-lg text-xs font-code overflow-x-auto whitespace-pre-wrap max-h-[500px]">
                        {results.db.prismaSchema}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="structure">
                <Card className="border-none shadow-sm">
                  <CardHeader><CardTitle className="font-headline">{t.systemGen.structure}</CardTitle></CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-6 rounded-lg text-sm font-code overflow-x-auto">
                      {results.structure.folderStructure}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="api">
                <div className="space-y-6">
                  <Card className="border-none shadow-sm">
                    <CardHeader><CardTitle className="font-headline">{t.systemGen.apiBoilerplate}</CardTitle></CardHeader>
                    <CardContent>
                      <pre className="bg-muted p-6 rounded-lg text-xs font-code overflow-x-auto">
                        {results.api.stockMovementServiceExample}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="endpoints">
                <Card className="border-none shadow-sm">
                  <CardHeader><CardTitle className="font-headline">{t.systemGen.endpoints}</CardTitle></CardHeader>
                  <CardContent className="prose prose-sm max-w-none">
                    <pre className="bg-muted p-6 rounded-lg text-xs font-code overflow-x-auto whitespace-pre-wrap">
                      {results.api.apiEndpoints}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
