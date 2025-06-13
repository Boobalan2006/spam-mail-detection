"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface PrivacyPolicyDialogProps {
  triggerButton?: React.ReactNode;
}

export function PrivacyPolicyDialog({ triggerButton }: PrivacyPolicyDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
            Privacy
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Privacy Policy</DialogTitle>
          <DialogDescription>
            Last updated: May 2024
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="text-lg font-semibold mb-2">1. Introduction</h3>
              <p>
                SpamShield AI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our spam detection service.
              </p>
              <p className="mt-2">
                By using SpamShield AI, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">2. Information We Collect</h3>
              <p>
                <strong>Personal Information:</strong> When you register for an account, we collect your username, email address, and password (stored in encrypted form).
              </p>
              <p className="mt-2">
                <strong>Email Content:</strong> When you submit emails for spam analysis, we process the content of those emails to determine if they are spam or not.
              </p>
              <p className="mt-2">
                <strong>Usage Data:</strong> We collect information on how you interact with our service, including scan history, feature usage, and system performance.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">3. How We Use Your Information</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>To provide and maintain our service</li>
                <li>To detect and prevent spam emails</li>
                <li>To improve our spam detection algorithms</li>
                <li>To personalize your experience</li>
                <li>To communicate with you about service updates</li>
                <li>To respond to your inquiries and provide support</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">4. Data Security</h3>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
              <p className="mt-2">
                However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">5. Data Retention</h3>
              <p>
                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
              </p>
              <p className="mt-2">
                Your scan history is retained for up to 90 days, after which it is automatically deleted.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">6. Your Rights</h3>
              <p>
                Depending on your location, you may have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Access the personal information we hold about you</li>
                <li>Correct inaccurate or incomplete information</li>
                <li>Delete your personal information</li>
                <li>Restrict or object to our processing of your information</li>
                <li>Data portability (receiving your data in a structured, machine-readable format)</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">7. Children's Privacy</h3>
              <p>
                Our service is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">8. Changes to This Privacy Policy</h3>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
              <p className="mt-2">
                You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">9. Contact Us</h3>
              <p>
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <p className="mt-2">
                Email: privacy@spamshield-ai.example.com
              </p>
              <p className="mt-1">
                Address: 123 AI Street, Tech City, TC 12345
              </p>
            </section>
          </div>
        </ScrollArea>
        <div className="flex justify-end mt-4">
          <Button onClick={() => setOpen(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}