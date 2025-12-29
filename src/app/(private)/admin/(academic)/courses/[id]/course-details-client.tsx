"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
    BookOpen,
    Cast,
    CheckCircle,
    Edit,
    Globe,
    GripVertical,
    LayoutDashboard,
    MoreVertical,
    Plus,
    PlusCircle,
    Settings,
    Trash2,
    UserPlus,
    Users,
    Video,
} from "lucide-react";
import Link from "next/link";
import { CourseWithDetails } from "@/types/course";
import { useRouter } from "next/navigation";
import { archiveCourse, deleteCourse, updateCourse, toggleCoursePublished } from "@/lib/actions/courses";
import { toast } from "sonner";

interface CourseDetailsClientProps {
    course: CourseWithDetails;
}

export default function CourseDetailsClient({ course }: CourseDetailsClientProps) {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState("lessons");
    const [isScrolled, setIsScrolled] = useState(false);
    const [isPending, setIsPending] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: course.title,
        description: course.description,
        level: course.level,
        language: course.language,
        classDuration: course.classDuration || 40,
    });

    // Smooth scrolling and Active Section Observer
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 100);

            const sections = ["lessons", "exams", "students", "teachers", "settings"];
            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    if (rect.top <= 180 && rect.bottom >= 180) { // Offset for sticky header
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            // Calculate offset to account for sticky headers (approx 140px)
            const headerOffset = 140;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.scrollY - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
            setActiveSection(id);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsPending(true);
        // Convert classDuration to number
        const payload = {
            ...formData,
            classDuration: Number(formData.classDuration)
        };

        // updateCourse requires EditCourseSchema, we pass compatible fields
        const result = await updateCourse(course.id, payload);
        setIsPending(false);

        if (result.success) {
            toast.success("Curso actualizado correctamente");
            router.refresh();
        } else {
            toast.error("Error al actualizar: " + result.error);
        }
    };

    const handleArchive = async () => {
        setIsPending(true);
        const result = await archiveCourse(course.id);
        setIsPending(false);
        if (result.success) {
            toast.success("Curso archivado exitosamente");
            router.refresh();
        } else {
            console.error(result.error);
            toast.error("Error al archivar el curso");
        }
    };

    const handleDelete = async () => {
        setIsPending(true);
        const result = await deleteCourse(course.id);
        if (result.success) {
            toast.success("Curso eliminado");
            router.push("/admin/courses");
        } else {
            setIsPending(false);
            console.error(result.error);
            toast.error("Error al eliminar el curso");
        }
    };

    const handleTogglePublished = async () => {
        const result = await toggleCoursePublished(course.id);
        if (result.success) {
            toast.success("Estado de publicación actualizado");
            router.refresh();
        } else {
            toast.error("Error al actualizar estado");
        }
    }

    return (
        <div className="min-h-screen bg-background pb-20 font-lexend">
            {/* Breadcrumb */}
            <div className="px-4 lg:px-10 py-4 max-w-[1200px] mx-auto w-full">
                <div className="flex flex-wrap gap-2 items-center text-sm font-medium text-muted-foreground">
                    <Link href="/admin" className="hover:text-primary transition-colors">
                        Administración
                    </Link>
                    <span>/</span>
                    <Link
                        href="/admin/courses"
                        className="hover:text-primary transition-colors"
                    >
                        Cursos
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">
                        {course.title}
                    </span>
                </div>
            </div>

            <main className="px-4 lg:px-10 w-full max-w-[1200px] mx-auto space-y-8">
                {/* Course Info Card */}
                <Card className="overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Cover Image */}
                            <div className="w-full md:w-56 h-36 flex-shrink-0 relative rounded-lg overflow-hidden border bg-muted group cursor-pointer">
                                {/* Placeholder or Actual Image */}
                                <div
                                    className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                                    style={{
                                        backgroundImage: course.image
                                            ? `url(${course.image})`
                                            : "url('https://placehold.co/600x400?text=No+Image')"
                                    }}
                                />
                                <div className="absolute top-2 left-2">
                                    <span className="bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                        Curso
                                    </span>
                                </div>
                            </div>

                            {/* Course Details */}
                            <div className="flex-1 flex flex-col justify-between">
                                <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center flex-wrap gap-3 mb-2">
                                            <Badge
                                                variant="secondary"
                                                className={cn("gap-1.5", course.isPublished ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200")}
                                            >
                                                <span className={cn("w-1.5 h-1.5 rounded-full", course.isPublished ? "bg-emerald-500" : "bg-yellow-500")}></span>{" "}
                                                {course.isPublished ? "Publicado" : "Borrador"}
                                            </Badge>
                                            <span className="text-muted-foreground text-xs font-mono bg-muted px-2 py-1 rounded">
                                                ID: {course.id.slice(0, 8).toUpperCase()}
                                            </span>
                                        </div>
                                        <h1 className="text-3xl font-bold leading-tight tracking-tight">
                                            {course.title}
                                        </h1>
                                        <p className="text-muted-foreground text-sm mt-2 max-w-2xl leading-relaxed line-clamp-2">
                                            {course.description}
                                        </p>
                                    </div>
                                    <div className="flex gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                                        <Button variant="outline" className="flex-1 lg:flex-none">
                                            <Video className="w-4 h-4 mr-2" />
                                            Vista Previa
                                        </Button>
                                        <Button
                                            className="flex-1 lg:flex-none"
                                            onClick={handleSave}
                                            disabled={isPending}
                                        >
                                            {isPending ? "Guardando..." : "Guardar Cambios"}
                                        </Button>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-5 border-t">
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                                            Idioma
                                        </p>
                                        <p className="font-medium flex items-center gap-2 text-sm">
                                            <Globe className="w-4 h-4 text-muted-foreground" />
                                            {course.language}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                                            Nivel
                                        </p>
                                        <p className="font-medium flex items-center gap-2 text-sm">
                                            <BookOpen className="w-4 h-4 text-muted-foreground" />
                                            {course.level}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                                            Total Inscritos
                                        </p>
                                        <p className="font-medium flex items-center gap-2 text-sm">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                            {course._count.enrollments} Estudiantes
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                                            Lecciones
                                        </p>
                                        <p className="font-medium flex items-center gap-2 text-sm">
                                            <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                                            {course.modules.length} Módulos
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Sticky Sub-navigation */}
                <div className="sticky top-[4rem] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-2 pb-4 -mx-4 px-4 lg:-mx-10 lg:px-10 mb-2 transition-all duration-300 border-b">
                    <nav className="flex gap-1 overflow-x-auto max-w-full pb-1">
                        <Link
                            href="#lessons"
                            onClick={(e) => scrollToSection(e, "lessons")}
                            className={cn("flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors", activeSection === "lessons" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60")}
                        >
                            <BookOpen className="w-4 h-4" /> Lecciones
                        </Link>
                        <Link
                            href="#exams"
                            onClick={(e) => scrollToSection(e, "exams")}
                            className={cn("flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors", activeSection === "exams" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60")}
                        >
                            <CheckCircle className="w-4 h-4" /> Exámenes
                        </Link>
                        <Link
                            href="#students"
                            onClick={(e) => scrollToSection(e, "students")}
                            className={cn("flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors", activeSection === "students" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60")}
                        >
                            <Users className="w-4 h-4" /> Estudiantes
                        </Link>
                        <Link
                            href="#teachers"
                            onClick={(e) => scrollToSection(e, "teachers")}
                            className={cn("flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors", activeSection === "teachers" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60")}
                        >
                            <Cast className="w-4 h-4" /> Profesores
                        </Link>
                        <Link
                            href="#settings"
                            onClick={(e) => scrollToSection(e, "settings")}
                            className={cn("flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors", activeSection === "settings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60")}
                        >
                            <Settings className="w-4 h-4" /> Configuración
                        </Link>
                    </nav>
                </div>

                <div className="space-y-12">
                    {/* Lessons Section */}
                    <section id="lessons" className="scroll-mt-32">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold">Plan de Estudios</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Gestiona lecciones, módulos y materiales de aprendizaje.
                                </p>
                            </div>
                            <Button>
                                <Plus className="w-5 h-5 mr-2" /> Agregar Módulo
                            </Button>
                        </div>

                        {course.modules.length === 0 ? (
                            <Card className="p-8 text-center text-muted-foreground">
                                <p>No hay módulos creados aún.</p>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {course.modules.map((module) => (
                                    <Card key={module.id} className="overflow-hidden">
                                        <div className="bg-muted/30 px-6 py-3 border-b flex justify-between items-center">
                                            <h4 className="font-bold text-sm">{module.title}</h4>
                                            <Badge variant={module.isPublished ? "secondary" : "outline"}>
                                                {module.isPublished ? "Publicado" : "Borrador"}
                                            </Badge>
                                        </div>
                                        <div className="p-6">
                                            <p className="text-sm text-muted-foreground">{module.description || "Sin descripción"}</p>
                                            <div className="mt-4 flex gap-2">
                                                <Button variant="outline" size="sm">Ver Lecciones ({module._count.lessons})</Button>
                                                <Button variant="ghost" size="sm"><Edit className="w-4 h-4 mr-2" /> Editar</Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}

                    </section>

                    {/* Exams Section */}
                    <section id="exams" className="scroll-mt-32 pt-6 border-t">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold">Evaluaciones</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Cuestionarios, exámenes y certificaciones.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary">
                                    <PlusCircle className="w-5 h-5 mr-2" /> Agregar Examen
                                </Button>
                            </div>
                        </div>
                        {/* Placeholder for Exams as they are not eagerly fetched in CourseWithDetails fully */}
                        <Card className="p-8 text-center text-muted-foreground border-dashed">
                            <p>Gestión de exámenes próximamente.</p>
                        </Card>
                    </section>

                    {/* Students Section */}
                    <section id="students" className="scroll-mt-32 pt-6 border-t">
                        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                            <div>
                                <h3 className="text-xl font-bold">Estudiantes Inscritos</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Monitorea el progreso y gestiona inscripciones.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="secondary">
                                    <UserPlus className="w-5 h-5 mr-2" /> Inscribir Estudiante
                                </Button>
                            </div>
                        </div>

                        {course.enrollments.length === 0 ? (
                            <Card className="p-8 text-center text-muted-foreground">
                                <p>No hay estudiantes inscritos.</p>
                            </Card>
                        ) : (
                            <Card className="overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Estudiante</TableHead>
                                            <TableHead className="w-32">Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {course.enrollments.slice(0, 5).map(enrollment => (
                                            <TableRow key={enrollment.id} className="group">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                            {enrollment.student.name?.[0] || "U"}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold">{enrollment.student.name || "Usuario"}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {enrollment.student.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="secondary"
                                                        className={cn(
                                                            enrollment.status === 'ACTIVE' ? "bg-green-100 text-green-800" :
                                                                enrollment.status === 'PENDING' ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                                                        )}
                                                    >
                                                        {enrollment.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {course.enrollments.length > 5 && (
                                    <div className="p-4 text-center border-t">
                                        <Button variant="link">Ver todos los estudiantes</Button>
                                    </div>
                                )}
                            </Card>
                        )}
                    </section>

                    {/* Teachers Section */}
                    <section id="teachers" className="scroll-mt-32 pt-6 border-t">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold">Instructores</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Gestiona el personal docente asignado a este curso.
                                </p>
                            </div>
                            <Button variant="secondary">
                                <UserPlus className="w-5 h-5 mr-2" /> Asignar Profesor
                            </Button>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card>
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                                        {course.createdBy.name?.[0] || "A"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold truncate">{course.createdBy.name}</h4>
                                        <p className="text-xs text-muted-foreground truncate">
                                            Creador del Curso
                                        </p>
                                        <div className="flex mt-2 gap-3">
                                            <button className="text-xs font-medium text-primary hover:underline">
                                                Perfil
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    {/* Settings Section */}
                    <section id="settings" className="scroll-mt-32 pt-6 border-t">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold">Configuración del Curso</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Configuración general y reglas de inscripción.
                            </p>
                        </div>
                        <Card className="p-6 lg:p-8 divide-y">
                            <div className="pb-8">
                                <h4 className="text-lg font-bold mb-4">Información General</h4>
                                <div className="space-y-4 max-w-2xl">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold">
                                            Título del Curso
                                        </label>
                                        <Input
                                            name="title"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold">Descripción</label>
                                        <textarea
                                            name="description"
                                            className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="py-8">
                                <h4 className="text-lg font-bold mb-4">Configuración Avanzada</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                                    <div className="flex items-center justify-between col-span-1 md:col-span-2 bg-muted/50 p-4 rounded-lg">
                                        <div>
                                            <p className="text-sm font-bold">Visibilidad Pública</p>
                                            <p className="text-xs text-muted-foreground">
                                                Mostrar curso en el catálogo para todos los estudiantes.
                                            </p>
                                        </div>
                                        <Switch checked={course.isPublished} onCheckedChange={handleTogglePublished} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8">
                                <h4 className="text-lg font-bold text-red-600 mb-4">
                                    Zona de Peligro
                                </h4>
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-red-900 dark:text-red-300">
                                                Archivar este curso
                                            </p>
                                            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                                                El curso se ocultará pero los datos se conservarán.
                                            </p>
                                        </div>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/50">
                                                    Archivar Curso
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Archivar curso?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción ocultará el curso de la lista pública. Puedes volver a publicarlo en cualquier momento.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleArchive}>Archivar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                    <div className="h-px bg-red-200 dark:bg-red-800" />
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-red-900 dark:text-red-300">
                                                Eliminar este curso
                                            </p>
                                            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                                                Esta acción no se puede deshacer. Se perderán todos los datos.
                                            </p>
                                        </div>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar Curso
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción no se puede deshacer. Esto eliminará permanentemente el curso <b>{course.title}</b> y removerá todos los datos asociados de nuestros servidores.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Eliminar Definitivamente</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </section>
                </div>
            </main>
        </div>
    );
}
