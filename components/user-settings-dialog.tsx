"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  notifications: z.boolean(),
  emailDigest: z.boolean(),
})

interface UserSettingsDialogProps {
  triggerButton?: React.ReactNode;
}

export function UserSettingsDialog({ triggerButton }: UserSettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { theme, setTheme } = useTheme()
  
  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      theme: (theme as "light" | "dark" | "system") || "light",
      notifications: true,
      emailDigest: false,
    },
  })

  // Load user settings when dialog opens
  useEffect(() => {
    if (open) {
      const loadUserSettings = async () => {
        try {
          setLoading(true)
          
          // Get stored settings from localStorage or use defaults
          const storedSettings = localStorage.getItem("user_settings")
          if (storedSettings) {
            const parsedSettings = JSON.parse(storedSettings)
            form.reset({
              theme: parsedSettings.theme || "light",
              notifications: parsedSettings.notifications !== undefined ? parsedSettings.notifications : true,
              emailDigest: parsedSettings.emailDigest !== undefined ? parsedSettings.emailDigest : false,
            })
          } else {
            // Use current theme if no stored settings
            form.reset({
              theme: (theme as "light" | "dark" | "system") || "light",
              notifications: true,
              emailDigest: false,
            })
          }
        } catch (error) {
          console.error("Error loading user settings:", error)
          toast.error("Failed to load settings")
        } finally {
          setLoading(false)
        }
      }
      
      loadUserSettings()
    }
  }, [open, form, theme])

  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    try {
      setLoading(true)
      
      // Save settings to localStorage
      localStorage.setItem("user_settings", JSON.stringify(values))
      
      // Apply theme change immediately
      setTheme(values.theme)
      
      toast.success("Settings updated successfully")
      setOpen(false)
    } catch (error) {
      console.error("Error updating settings:", error)
      toast.error("Failed to update settings")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="ghost">Settings</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>User Settings</DialogTitle>
          <DialogDescription>
            Customize your experience with SpamShield AI
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Theme</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="light" id="light" />
                          <Label htmlFor="light" className="flex items-center">
                            <Sun className="mr-2 h-4 w-4" />
                            Light
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="dark" id="dark" />
                          <Label htmlFor="dark" className="flex items-center">
                            <Moon className="mr-2 h-4 w-4" />
                            Dark
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="system" id="system" />
                          <Label htmlFor="system">System</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Select your preferred theme for the application.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Notifications
                      </FormLabel>
                      <FormDescription>
                        Receive notifications about scan results and security alerts.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="emailDigest"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Email Digest
                      </FormLabel>
                      <FormDescription>
                        Receive weekly email summaries of your scan activity.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}