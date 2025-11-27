import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold mb-2">
              TRACER C2 Analytics Dashboard
            </CardTitle>
            <CardDescription className="text-lg">
              Professional merchant account analytics and reporting
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold">Track Revenue</h3>
              <p className="text-sm text-muted-foreground">
                Monitor revenue trends across 8 payment processors
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold">Analyze Retention</h3>
              <p className="text-sm text-muted-foreground">
                Track merchant retention and account growth
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold">Generate Reports</h3>
              <p className="text-sm text-muted-foreground">
                Create co-branded PDF reports for partners
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Link href="/login">
              <Button size="lg" data-testid="button-login">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="outline" data-testid="button-signup">
                Create Account
              </Button>
            </Link>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Secure session-based authentication
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
