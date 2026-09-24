import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LogOut, BookOpen, DollarSign, HelpCircle, MessageSquare, Database, BarChart3 } from "lucide-react";
import AdminFaqs from "@/components/admin/AdminFaqs";
import AdminCourses from "@/components/admin/AdminCourses";
import AdminFees from "@/components/admin/AdminFees";
import AdminChatQueries from "@/components/admin/AdminChatQueries";
import AdminKnowledgeBase from "@/components/admin/AdminKnowledgeBase";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminDocuments from "@/components/admin/AdminDocuments";

export default function Admin(){
  const {isAdmin,isLoading,signOut}=useAuth(); const navigate=useNavigate();
  if(isLoading)return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if(!isAdmin)return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><p className="text-destructive font-semibold text-lg">Access Denied</p><p className="text-muted-foreground">You don't have admin privileges.</p><Button onClick={()=>navigate("/")}>Go Home</Button></div>;
  return <div className="min-h-screen bg-background"><header className="sticky top-0 z-50 border-b border-border glass-card"><div className="container flex h-16 items-center justify-between px-4"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={()=>navigate("/")}><ArrowLeft className="h-5 w-5"/></Button><h1 className="text-xl font-bold">Admin Panel</h1></div><Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4 mr-2"/>Sign Out</Button></div></header>
  <main className="container px-4 py-6 space-y-6"><AdminAnalytics/><Tabs defaultValue="knowledge" className="w-full"><TabsList className="grid w-full grid-cols-2 sm:grid-cols-7 mb-6"><TabsTrigger value="knowledge"><Database className="h-4 w-4 mr-2"/>Knowledge</TabsTrigger><TabsTrigger value="faqs"><HelpCircle className="h-4 w-4 mr-2"/>FAQs</TabsTrigger><TabsTrigger value="courses"><BookOpen className="h-4 w-4 mr-2"/>Courses</TabsTrigger><TabsTrigger value="fees"><DollarSign className="h-4 w-4 mr-2"/>Fees</TabsTrigger><TabsTrigger value="queries"><MessageSquare className="h-4 w-4 mr-2"/>Queries</TabsTrigger><TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-2"/>Analytics</TabsTrigger><TabsTrigger value="documents"><Database className="h-4 w-4 mr-2"/>Documents</TabsTrigger></TabsList>
  <TabsContent value="knowledge"><AdminKnowledgeBase/></TabsContent><TabsContent value="faqs"><AdminFaqs/></TabsContent><TabsContent value="courses"><AdminCourses/></TabsContent><TabsContent value="fees"><AdminFees/></TabsContent><TabsContent value="queries"><AdminChatQueries/></TabsContent><TabsContent value="analytics"><AdminAnalytics/></TabsContent><TabsContent value="documents"><AdminDocuments/></TabsContent></Tabs></main></div>;
}
