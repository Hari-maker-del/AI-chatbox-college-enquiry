import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LogOut, BookOpen, DollarSign, HelpCircle, MessageSquare, ClipboardList, LayoutDashboard } from "lucide-react";
import AdminFaqs from "@/components/admin/AdminFaqs";
import AdminCourses from "@/components/admin/AdminCourses";
import AdminFees from "@/components/admin/AdminFees";
import AdminChatQueries from "@/components/admin/AdminChatQueries";
import AdminCampusOps from "@/components/admin/AdminCampusOps";

const Admin = () => {
  const { isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f6f8f7]"><p className="text-muted-foreground">Loading CampusOS...</p></div>;

  if (!isAdmin) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f8f7] gap-4"><p className="text-destructive font-semibold text-lg">Access Denied</p><p className="text-muted-foreground">You don't have admin privileges.</p><Button onClick={() => navigate("/")}>Go Home</Button></div>;
  }

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-[#17252a]">
      <header className="sticky top-0 z-50 border-b border-[#17252a]/10 bg-[#f6f8f7]/95 backdrop-blur">
        <div className="max-w-[1500px] mx-auto px-5 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-none hover:bg-[#dff1ef]"><ArrowLeft className="h-5 w-5" /></Button>
            <div><div className="text-[10px] tracking-[0.28em] uppercase text-[#2b7a78]">CampusOS / Administration</div><h1 className="text-2xl md:text-3xl font-semibold tracking-tight">OPERATIONS CONTROL</h1></div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="rounded-none border-[#17252a]/20"><LogOut className="h-4 w-4 mr-2" /> Sign Out</Button>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-5 md:px-8 py-8">
        <section className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-0 mb-8 border border-[#17252a]/10">
          <div className="bg-[#1f8f91] text-white p-7 md:p-10 min-h-[230px] flex flex-col justify-between">
            <div className="text-[10px] tracking-[0.3em] uppercase opacity-80">01 / Daily overview</div>
            <div><div className="text-5xl md:text-7xl font-semibold tracking-[-0.05em] leading-[0.88]">RUN THE<br/>CAMPUS.</div><p className="mt-5 max-w-lg text-sm md:text-base text-white/80">Monitor student services, resolve requests and keep every operational workflow moving.</p></div>
          </div>
          <div className="bg-[#17252a] text-white p-7 md:p-10 flex flex-col justify-between">
            <div className="text-[10px] tracking-[0.3em] uppercase text-[#9bd5d2]">02 / Control room</div>
            <div className="grid grid-cols-2 gap-5"><div><div className="text-4xl font-semibold">LIVE</div><div className="text-[10px] tracking-[0.18em] uppercase text-white/50 mt-1">Database</div></div><div><div className="text-4xl font-semibold">24/7</div><div className="text-[10px] tracking-[0.18em] uppercase text-white/50 mt-1">Access</div></div></div>
          </div>
        </section>

        <Tabs defaultValue="campus-ops" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b border-[#17252a]/15 bg-transparent h-auto p-0 mb-8 gap-1">
            <TabsTrigger value="campus-ops" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-[#1f8f91] data-[state=active]:text-[#1f8f91]"><ClipboardList className="h-4 w-4 mr-2" /> Campus Ops</TabsTrigger>
            <TabsTrigger value="faqs" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-[#1f8f91] data-[state=active]:text-[#1f8f91]"><HelpCircle className="h-4 w-4 mr-2" /> FAQs</TabsTrigger>
            <TabsTrigger value="courses" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-[#1f8f91] data-[state=active]:text-[#1f8f91]"><BookOpen className="h-4 w-4 mr-2" /> Courses</TabsTrigger>
            <TabsTrigger value="fees" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-[#1f8f91] data-[state=active]:text-[#1f8f91]"><DollarSign className="h-4 w-4 mr-2" /> Fees</TabsTrigger>
            <TabsTrigger value="queries" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-[#1f8f91] data-[state=active]:text-[#1f8f91]"><MessageSquare className="h-4 w-4 mr-2" /> Queries</TabsTrigger>
          </TabsList>
          <TabsContent value="campus-ops"><AdminCampusOps /></TabsContent>
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
