"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

interface SimplifiedAuthProps {
  onAuthSuccess: (userData: any) => void;
}

export function SimplifiedAuth({ onAuthSuccess }: SimplifiedAuthProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")
  const [loading, setLoading] = useState(false)

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  })

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true)
    try {
      // For demo purposes, we'll simulate a successful login
      // In a real app, you would make an API call to your backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user data
      const userData = {
        username: "Demo User",
        email: values.email,
      };
      
      // Store auth data in localStorage
      localStorage.setItem('auth_token', 'mock-jwt-token');
      localStorage.setItem('user_data', JSON.stringify(userData));
      localStorage.setItem('user_id', 'demo_user');
      
      toast.success('Login successful');
      onAuthSuccess(userData);
    } catch (error) {
      toast.error('Login failed', {
        description: error instanceof Error ? error.message : 'Please check your credentials and try again'
      });
    } finally {
      setLoading(false);
    }
  }

  const handleRegister = async (values: z.infer<typeof registerSchema>) => {
    setLoading(true)
    try {
      // For demo purposes, we'll simulate a successful registration
      // In a real app, you would make an API call to your backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create user data
      const userData = {
        username: values.username,
        email: values.email,
      };
      
      // Store auth data in localStorage
      localStorage.setItem('auth_token', 'mock-jwt-token');
      localStorage.setItem('user_data', JSON.stringify(userData));
      localStorage.setItem('user_id', values.username.toLowerCase().replace(/\s+/g, '_'));
      
      toast.success('Registration successful');
      onAuthSuccess(userData);
    } catch (error) {
      toast.error('Registration failed', {
        description: error instanceof Error ? error.message : 'Please try with different credentials'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>
      <TabsContent value="login" className="mt-4">
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="your.email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </Form>
      </TabsContent>
      <TabsContent value="register" className="mt-4">
        <Form {...registerForm}>
          <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
            <FormField
              control={registerForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="your.email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </Button>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  )
}