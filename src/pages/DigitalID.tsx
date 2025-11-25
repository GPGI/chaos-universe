import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Building2, 
  Users, 
  Wallet, 
  Image as ImageIcon,
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Copy,
  LogOut,
  Key,
  Network,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/contexts/WalletContext";
import { useAccountManagement } from "@/contexts/AccountManagementContext";
import { useDigitalID } from "@/hooks/useDigitalID";
import { useLandPlots } from "@/hooks/useLandPlots";
import { AccountSelector } from "@/components/AccountSelector";
import { ethers } from "ethers";
import { formatEther } from "ethers";
import { getRpcProvider } from "@/lib/wallet";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DigitalID = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { address, signer, isConnected, balance, connect, disconnect } = useWallet();
  const { digitalID, hasDigitalID, loading: idLoading, registerDigitalID, checkDigitalID, hasContract, deactivateDigitalID } = useDigitalID();
  const { userPlots, loading: plotsLoading } = useLandPlots();
  
  // Wallet management state
  const [newWalletAddress, setNewWalletAddress] = useState<string | null>(null);
  const [newWalletPrivateKey, setNewWalletPrivateKey] = useState<string | null>(null);
  const [showNewWallet, setShowNewWallet] = useState(false);
  const [switchingWallet, setSwitchingWallet] = useState(false);
  
  const [idType, setIdType] = useState<'personal' | 'corporate' | 'organization' | null>(null);
  
  // Personal fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // Corporate fields
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [corporateEmail, setCorporateEmail] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [taxId, setTaxId] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [representativeTitle, setRepresentativeTitle] = useState("");
  
  // Organization fields
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [mission, setMission] = useState("");
  
  // Private Trust fields
  const [isPrivateTrust, setIsPrivateTrust] = useState(false);
  const [commonWalletAddress, setCommonWalletAddress] = useState("");
  const [trustName, setTrustName] = useState("");
  const [trustees, setTrustees] = useState("");
  const [beneficiaries, setBeneficiaries] = useState("");
  const [trustPurpose, setTrustPurpose] = useState("");
  
  const [registering, setRegistering] = useState(false);

  // Check for redirect after Digital ID creation
  useEffect(() => {
    if (hasDigitalID) {
      const redirect = searchParams.get("redirect");
      const plotId = searchParams.get("plotId");
      const paymentMethod = searchParams.get("paymentMethod");
      
      if (redirect && plotId && paymentMethod) {
        // Redirect back to purchase flow
        setTimeout(() => {
          navigate(`/quick-actions?plotId=${plotId}&paymentMethod=${paymentMethod}`);
        }, 2000);
      } else if (redirect) {
        // Generic redirect
        setTimeout(() => {
          navigate(redirect);
        }, 2000);
      }
    }
  }, [hasDigitalID, searchParams, navigate]);

  const handleCreateID = async () => {
    if (!isConnected || !signer) {
      toast.error("Please connect your wallet first");
      await connect();
      return;
    }

    // Validate based on ID type
    let isValid = false;
    let displayName = "";
    let emailToUse = "";
    
    if (idType === 'personal') {
      if (!firstName || !lastName || !email) {
        toast.error("First name, last name, and email are required");
        return;
      }
      isValid = true;
      displayName = `${firstName} ${lastName}`;
      emailToUse = email;
    } else if (idType === 'corporate') {
      if (!companyName || !companyType || !registrationNumber || !corporateEmail || !businessAddress || !representativeName || !representativeTitle) {
        toast.error("Company name, type, registration number, email, address, representative name, and title are required");
        return;
      }
      isValid = true;
      displayName = companyName;
      emailToUse = corporateEmail;
    } else if (idType === 'organization') {
      if (!orgName || !orgType || !orgEmail || !contactPerson || !orgAddress) {
        toast.error("Organization name, type, email, contact person, and address are required");
        return;
      }
      // If private trust, validate trust-specific fields
      if (isPrivateTrust) {
        if (!commonWalletAddress || !trustName) {
          toast.error("Common wallet address and trust name are required for private trust");
          return;
        }
        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(commonWalletAddress)) {
          toast.error("Invalid wallet address format");
          return;
        }
      }
      isValid = true;
      displayName = isPrivateTrust ? trustName : orgName;
      emailToUse = orgEmail;
    }

    if (!isValid || !idType) {
      toast.error("Please fill in all required fields");
      return;
    }

    setRegistering(true);
    try {
      // Use appropriate name fields based on type
      const firstNameToUse = idType === 'personal' ? firstName : (idType === 'corporate' ? representativeName : contactPerson);
      const lastNameToUse = idType === 'personal' ? lastName : (idType === 'corporate' ? representativeTitle : "");
      
      const txHash = await registerDigitalID(firstNameToUse, lastNameToUse, emailToUse, avatarUrl);
      toast.success(`${idType === 'personal' ? 'Personal' : idType === 'corporate' ? 'Corporate' : 'Organization'} Digital ID registered! TX: ${txHash.slice(0, 10)}...`);
      
      // Refresh Digital ID status
      await checkDigitalID();
      
      // Reset all fields
      setFirstName("");
      setLastName("");
      setEmail("");
      setDateOfBirth("");
      setPhone("");
      setAvatarUrl("");
      setCompanyName("");
      setCompanyType("");
      setRegistrationNumber("");
      setCorporateEmail("");
      setBusinessAddress("");
      setWebsite("");
      setTaxId("");
      setRepresentativeName("");
      setRepresentativeTitle("");
      setOrgName("");
      setOrgType("");
      setOrgEmail("");
      setContactPerson("");
      setOrgAddress("");
      setOrgWebsite("");
      setMission("");
      setIsPrivateTrust(false);
      setCommonWalletAddress("");
      setTrustName("");
      setTrustees("");
      setBeneficiaries("");
      setTrustPurpose("");
      setIdType(null);

      // Check if we need to redirect
      const redirect = searchParams.get("redirect");
      const plotId = searchParams.get("plotId");
      const paymentMethod = searchParams.get("paymentMethod");
      
      if (redirect && plotId && paymentMethod) {
        toast.info("Redirecting back to purchase...");
      } else if (redirect) {
        toast.info("Redirecting...");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register Digital ID");
    } finally {
      setRegistering(false);
    }
  };

  // Create new wallet on Chaos Star Network
  const createNewWallet = () => {
    try {
      const wallet = ethers.Wallet.createRandom();
      const newAddress = wallet.address;
      const privateKey = wallet.privateKey;
      
      setNewWalletAddress(newAddress);
      setNewWalletPrivateKey(privateKey);
      setShowNewWallet(true);
      
      toast.success("New wallet created on Chaos Star Network!");
    } catch (error: any) {
      console.error("Error creating wallet:", error);
      toast.error("Failed to create new wallet");
    }
  };

  // Switch to new wallet
  const switchToNewWallet = async () => {
    if (!newWalletPrivateKey) {
      toast.error("No wallet created yet");
      return;
    }

    setSwitchingWallet(true);
    try {
      // Disconnect current wallet
      await disconnect();
      
      // Create provider for Chaos Star Network (Avalanche subnet)
      const provider = getRpcProvider();
      if (!provider) {
        throw new Error("Could not connect to Chaos Star Network");
      }

      // Create wallet from private key
      const wallet = new ethers.Wallet(newWalletPrivateKey, provider);
      
      // Try to connect via MetaMask by requesting account switch
      const { ethereum } = window as any;
      if (ethereum) {
        // For now, just show the wallet details - user needs to import it into MetaMask
        toast.info("Please import this wallet into MetaMask to use it. Private key has been copied to clipboard.");
        await navigator.clipboard.writeText(newWalletPrivateKey);
      } else {
        // Store the wallet info for later use
        localStorage.setItem("chaos_star_wallet_private_key", newWalletPrivateKey);
        toast.success("Wallet created! You can now import it into MetaMask.");
      }

      // Check Digital ID for new wallet
      await checkDigitalID(newWalletAddress);
      
      toast.success("Wallet created successfully!");
    } catch (error: any) {
      console.error("Error switching wallet:", error);
      toast.error(error.message || "Failed to switch wallet");
    } finally {
      setSwitchingWallet(false);
    }
  };

  // Switch to different wallet
  const handleSwitchWallet = async () => {
    setSwitchingWallet(true);
    try {
      await disconnect();
      toast.info("Please connect a different wallet");
      await connect();
      if (address) {
        await checkDigitalID(address);
      }
    } catch (error: any) {
      console.error("Error switching wallet:", error);
      toast.error(error.message || "Failed to switch wallet");
    } finally {
      setSwitchingWallet(false);
    }
  };

  // Copy address to clipboard
  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
  };

  // Copy private key to clipboard (for new wallet)
  const copyPrivateKey = async () => {
    if (newWalletPrivateKey) {
      await navigator.clipboard.writeText(newWalletPrivateKey);
      toast.success("Private key copied to clipboard");
    }
  };

  // Render wallet connection prompt
  if (!isConnected) {
    return (
      <div className="min-h-screen pt-20">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="glass p-12 text-center">
            <Wallet className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold mb-4 bg-gradient-cosmic bg-clip-text text-transparent">
              Connect Your Wallet
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Connect your wallet to create and manage your Digital ID
            </p>
            <Button variant="cosmic" size="lg" onClick={() => connect()}>
              <Wallet className="h-5 w-5 mr-2" />
              Connect Wallet
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Render ID creation view if no ID exists
  if (!hasDigitalID) {
    return (
      <div className="min-h-screen pt-20">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="mb-12 text-center">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-cosmic bg-clip-text text-transparent">
              Create Your Digital ID
            </h1>
            <p className="text-xl text-muted-foreground">
              Register your identity on-chain on Chaos Star Network to participate in the Sarakt Universe
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
              <div className="text-sm text-muted-foreground">
              Wallet: {address?.slice(0, 10)}...{address?.slice(-8)}
              </div>
              {hasContract ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Blockchain Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                  <XCircle className="h-3 w-3 mr-1" />
                  Contract Not Deployed
                </Badge>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {["personal", "corporate", "organization"].map((type) => {
              const label = type.charAt(0).toUpperCase() + type.slice(1);
              const Icon = type === "personal" ? User : type === "corporate" ? Building2 : Users;
              const border = idType === type ? "border-primary shadow-glow-primary" : "border-primary/30 hover:border-primary/60";
              return (
                <Card
                  key={type}
                  className={`glass p-8 cursor-pointer transition-all text-center ${border}`}
                  onClick={() => setIdType(type as any)}
                >
                  <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {type === "personal"
                      ? "Individual citizen identity"
                      : type === "corporate"
                      ? "Business entity registration"
                      : "Group or collective identity"}
                  </p>
                </Card>
              );
            })}
          </div>

          {idType && (
            <Card className="glass p-8">
              <h2 className="text-2xl font-bold mb-6">Setup Your {idType.charAt(0).toUpperCase() + idType.slice(1)} ID</h2>
              
              {/* Personal ID Form */}
              {idType === 'personal' && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="firstName"
                        placeholder="Enter your first name"
                        className="glass mt-2"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="lastName"
                        placeholder="Enter your last name"
                        className="glass mt-2"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      className="glass mt-2"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        className="glass mt-2"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="glass mt-2"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="avatarUrl">Avatar URL (Optional)</Label>
                    <Input
                      id="avatarUrl"
                      placeholder="ipfs://... or https://..."
                      className="glass mt-2"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Corporate ID Form */}
              {idType === 'corporate' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Company Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="companyName"
                      placeholder="Your Company Inc."
                      className="glass mt-2"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyType">Company Type <span className="text-red-500">*</span></Label>
                    <select
                      id="companyType"
                      className="glass mt-2 w-full px-4 py-2 rounded-lg bg-background border border-accent/30 text-sm"
                      value={companyType}
                      onChange={(e) => setCompanyType(e.target.value)}
                    >
                      <option value="">Select company type...</option>
                      <option value="LLC">LLC (Limited Liability Company)</option>
                      <option value="Corporation">Corporation</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Sole Proprietorship">Sole Proprietorship</option>
                      <option value="Non-Profit">Non-Profit Organization</option>
                      <option value="Foundation">Foundation</option>
                      <option value="Cooperative">Cooperative</option>
                      <option value="Joint Venture">Joint Venture</option>
                      <option value="Advocacy">Advocacy</option>
                      <option value="Accounting Services">Accounting Services</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="registrationNumber">Registration Number <span className="text-red-500">*</span></Label>
                      <Input
                        id="registrationNumber"
                        placeholder="Company registration ID"
                        className="glass mt-2"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="taxId">Tax ID (Optional)</Label>
                      <Input
                        id="taxId"
                        placeholder="Tax identification number"
                        className="glass mt-2"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="corporateEmail">Contact Email <span className="text-red-500">*</span></Label>
                    <Input
                      id="corporateEmail"
                      type="email"
                      placeholder="contact@company.com"
                      className="glass mt-2"
                      value={corporateEmail}
                      onChange={(e) => setCorporateEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="businessAddress">Business Address <span className="text-red-500">*</span></Label>
                    <Input
                      id="businessAddress"
                      placeholder="123 Business St, City, Country"
                      className="glass mt-2"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="representativeName">Representative Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="representativeName"
                        placeholder="Legal representative full name"
                        className="glass mt-2"
                        value={representativeName}
                        onChange={(e) => setRepresentativeName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="representativeTitle">Representative Title <span className="text-red-500">*</span></Label>
                      <Input
                        id="representativeTitle"
                        placeholder="CEO, Director, etc."
                        className="glass mt-2"
                        value={representativeTitle}
                        onChange={(e) => setRepresentativeTitle(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://company.com"
                      className="glass mt-2"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="avatarUrl">Logo/Avatar URL (Optional)</Label>
                    <Input
                      id="avatarUrl"
                      placeholder="ipfs://... or https://..."
                      className="glass mt-2"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Organization ID Form */}
              {idType === 'organization' && (
                <div className="space-y-4">
                  {/* Private Trust Option */}
                  <div className="glass border border-primary/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isPrivateTrust"
                        checked={isPrivateTrust}
                        onCheckedChange={(checked) => setIsPrivateTrust(checked as boolean)}
                      />
                      <Label
                        htmlFor="isPrivateTrust"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Create Private Trust (Based on Common Wallet)
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 ml-6">
                      Enable this to create a private trust organization managed by a common wallet address
                    </p>
                  </div>

                  {!isPrivateTrust && (
                    <div>
                      <Label htmlFor="orgName">Organization Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="orgName"
                        placeholder="Organization Name"
                        className="glass mt-2"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                      />
                    </div>
                  )}

                  {isPrivateTrust && (
                    <>
                      <div>
                        <Label htmlFor="trustName">Trust Name <span className="text-red-500">*</span></Label>
                        <Input
                          id="trustName"
                          placeholder="e.g., Family Trust, Investment Trust"
                          className="glass mt-2"
                          value={trustName}
                          onChange={(e) => setTrustName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="commonWalletAddress">Common Wallet Address <span className="text-red-500">*</span></Label>
                        <Input
                          id="commonWalletAddress"
                          placeholder="0x..."
                          className="glass mt-2 font-mono"
                          value={commonWalletAddress}
                          onChange={(e) => setCommonWalletAddress(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          The shared wallet address that will manage this trust
                        </p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="trustees">Trustees (Optional)</Label>
                          <Input
                            id="trustees"
                            placeholder="Comma-separated trustee addresses or names"
                            className="glass mt-2"
                            value={trustees}
                            onChange={(e) => setTrustees(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="beneficiaries">Beneficiaries (Optional)</Label>
                          <Input
                            id="beneficiaries"
                            placeholder="Comma-separated beneficiary addresses or names"
                            className="glass mt-2"
                            value={beneficiaries}
                            onChange={(e) => setBeneficiaries(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="trustPurpose">Trust Purpose (Optional)</Label>
                        <Input
                          id="trustPurpose"
                          placeholder="Brief description of the trust's purpose"
                          className="glass mt-2"
                          value={trustPurpose}
                          onChange={(e) => setTrustPurpose(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="orgType">Organization Type <span className="text-red-500">*</span></Label>
                      <Input
                        id="orgType"
                        placeholder={isPrivateTrust ? "Private Trust" : "NGO, Foundation, Association, etc."}
                        className="glass mt-2"
                        value={isPrivateTrust ? "Private Trust" : orgType}
                        onChange={(e) => setOrgType(e.target.value)}
                        disabled={isPrivateTrust}
                      />
                    </div>
                    <div>
                      <Label htmlFor="orgEmail">Contact Email <span className="text-red-500">*</span></Label>
                      <Input
                        id="orgEmail"
                        type="email"
                        placeholder="contact@organization.org"
                        className="glass mt-2"
                        value={orgEmail}
                        onChange={(e) => setOrgEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactPerson">Contact Person <span className="text-red-500">*</span></Label>
                      <Input
                        id="contactPerson"
                        placeholder="Primary contact name"
                        className="glass mt-2"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="orgWebsite">Website (Optional)</Label>
                      <Input
                        id="orgWebsite"
                        type="url"
                        placeholder="https://organization.org"
                        className="glass mt-2"
                        value={orgWebsite}
                        onChange={(e) => setOrgWebsite(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="orgAddress">Organization Address <span className="text-red-500">*</span></Label>
                    <Input
                      id="orgAddress"
                      placeholder="123 Organization Ave, City, Country"
                      className="glass mt-2"
                      value={orgAddress}
                      onChange={(e) => setOrgAddress(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="mission">Mission/Description (Optional)</Label>
                    <Input
                      id="mission"
                      placeholder="Brief description of your organization's mission"
                      className="glass mt-2"
                      value={mission}
                      onChange={(e) => setMission(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="avatarUrl">Logo/Avatar URL (Optional)</Label>
                    <Input
                      id="avatarUrl"
                      placeholder="ipfs://... or https://..."
                      className="glass mt-2"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <Button
                variant="cosmic"
                size="lg"
                className="w-full mt-8"
                onClick={handleCreateID}
                disabled={
                  registering ||
                  (idType === 'personal' && (!firstName || !lastName || !email)) ||
                  (idType === 'corporate' && (!companyName || !companyType || !registrationNumber || !corporateEmail || !businessAddress || !representativeName || !representativeTitle)) ||
                  (idType === 'organization' && (
                    (!isPrivateTrust && (!orgName || !orgType || !orgEmail || !contactPerson || !orgAddress)) ||
                    (isPrivateTrust && (!trustName || !commonWalletAddress || !orgType || !orgEmail || !contactPerson || !orgAddress))
                  ))
                }
              >
                {registering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  `Register ${idType.charAt(0).toUpperCase() + idType.slice(1)} Digital ID`
                )}
              </Button>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Render dashboard view if ID exists
  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {currentSubnet && (
          <div className="mb-6">
            <SubnetSelector />
          </div>
        )}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-5xl font-bold bg-gradient-cosmic bg-clip-text text-transparent">
              Digital ID Dashboard
            </h1>
            <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-muted-foreground">ID Active</span>
              </div>
              {hasContract ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                  <Network className="h-3 w-3 mr-1" />
                  On Chaos Star Network
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                  <XCircle className="h-3 w-3 mr-1" />
                  Contract Not Deployed
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xl text-muted-foreground">
            Manage your identity, assets, and land ownership on Chaos Star Network
          </p>
          <div className="mt-4 flex items-center gap-4">
            <a
              href="/financial-hub"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 transition"
            >
              Proceed to Phase 1 Plot Purchase
            </a>
            {hasContract && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (confirm("Are you sure you want to deactivate your Digital ID? This action cannot be undone.")) {
                    try {
                      await deactivateDigitalID();
                      toast.success("Digital ID deactivated on Chaos Star Network");
                    } catch (error: any) {
                      toast.error(error.message || "Failed to deactivate Digital ID");
                    }
                  }
                }}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deactivate ID
              </Button>
            )}
          </div>
        </div>

        {/* Wallet Management Section */}
        <Card className="glass p-6 mb-8 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Wallet Management
            </h3>
            <div className="flex gap-2">
              <Dialog open={showNewWallet} onOpenChange={setShowNewWallet}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      createNewWallet();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Wallet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Wallet Created on Chaos Star Network</DialogTitle>
                    <DialogDescription>
                      Your new wallet has been generated. Save the private key securely - you'll need it to access this wallet.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Wallet Address</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={newWalletAddress || ""}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (newWalletAddress) {
                              await navigator.clipboard.writeText(newWalletAddress);
                              toast.success("Wallet address copied to clipboard");
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Private Key (Keep this secret!)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="password"
                          value={newWalletPrivateKey || ""}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyPrivateKey}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        ⚠️ Never share your private key with anyone. Import this into MetaMask to use it.
                      </p>
                    </div>
                    <Button
                      variant="cosmic"
                      className="w-full"
                      onClick={switchToNewWallet}
                      disabled={switchingWallet}
                    >
                      {switchingWallet ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Switching...
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4 mr-2" />
                          Import to MetaMask
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={handleSwitchWallet} disabled={switchingWallet}>
                {switchingWallet ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Switch Wallet
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border border-primary/20">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Connected Wallet</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {address || "Not connected"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  disabled={!address}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Badge variant={isConnected ? "default" : "outline"}>
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/40 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                Digital ID is connected to your wallet. You can change the wallet at any time, but your Digital ID will be associated with the wallet address you used to register it.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Profile Card */}
          <Card className="glass p-6 md:col-span-1">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-cosmic mb-4 flex items-center justify-center overflow-hidden">
                {digitalID?.avatarURI ? (
                  <img src={digitalID.avatarURI} alt="avatar" className="w-24 h-24 object-cover" />
                ) : (
                  <User className="h-12 w-12 text-primary-foreground" />
                )}
              </div>
              <h2 className="text-2xl font-bold mb-1">
                {digitalID?.firstName || "Unknown"} {digitalID?.lastName || ""}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">Digital ID</p>
              <div className="glass px-3 py-1 rounded-full text-xs mb-2 font-mono cursor-pointer hover:bg-primary/20 transition-colors" onClick={copyAddress} title="Click to copy">
                {address?.slice(0, 10)}...{address?.slice(-8)}
              </div>
              {digitalID?.email && (
                <div className="text-xs text-muted-foreground">{digitalID.email}</div>
              )}
              <div className="text-xs text-muted-foreground">
                Registered: {digitalID?.registeredAt 
                  ? new Date(Number(digitalID.registeredAt) * 1000).toLocaleDateString()
                  : "N/A"}
              </div>
            </div>
          </Card>

          {/* Assets Overview */}
          <Card className="glass p-6 md:col-span-2">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Assets Overview
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="glass p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">AVAX Balance</p>
                <p className="text-2xl font-bold text-primary">
                  {parseFloat(balance).toFixed(4)}
                </p>
              </div>
              <div className="glass p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Land Plots</p>
                <p className="text-2xl font-bold text-accent">
                  {userPlots.length}
                </p>
              </div>
              <div className="glass p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <p className="text-2xl font-bold text-green-500">
                  {hasDigitalID ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Land Ownership */}
        <Card className="glass p-6 mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Land Ownership ({userPlots.length} plots)
          </h3>
          {plotsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : userPlots.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPlots.map((plotId) => (
                <div key={plotId} className="glass p-4 rounded-lg">
                  <p className="font-bold mb-1">SP-{String(plotId).padStart(4, "0")}</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Sarakt Prime - District {((plotId - 1) % 10) + 1}
                  </p>
                  <p className="text-primary font-medium">Plot #{plotId}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No plots owned yet. Visit the Marketplace to purchase land.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DigitalID;
