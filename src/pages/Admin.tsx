import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LogOut, BookOpen, DollarSign, HelpCircle, MessageSquare } from "lucide-react";
import AdminFaqs from "@/components/admin/AdminFaqs";
import AdminCourses from "@/components/admin/AdminCourses";
import AdminFees from "@/components/admin/AdminFees";
import AdminChatQueries from "@/components/admin/AdminChatQueries";

const Admin = () => {
  const { isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-destructive font-semibold text-lg">Access Denied</p>
        <p className="text-muted-foreground">You don't have admin privileges.</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border glass-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold font-display text-foreground">Admin Panel</h1>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6">
        <Tabs defaultValue="faqs" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="faqs" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" /> FAQs
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Courses
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Fees
            </TabsTrigger>
            <TabsTrigger value="queries" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Queries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faqs"><AdminFaqs /></TabsContent>
          <TabsContent value="courses"><AdminCourses /></TabsContent>
          <TabsContent value="fees"><AdminFees /></TabsContent>
          <TabsContent value="queries"><AdminChatQueries /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
