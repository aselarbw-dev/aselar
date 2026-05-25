import React, { useState, useEffect } from "react";
import { FaCheck, FaCrown, FaRocket, FaStar, FaArrowRight } from "react-icons/fa";
import { MdSpeed, MdSecurity, MdSupport, MdAnalytics } from "react-icons/md";
import PricingStyles from "./Pricing.module.css";

interface PricingTier {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  savings?: string;
  icon: React.ReactNode;
  color: string;
}

const Pricing: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<string>("quarterly");
  const [animatedNumbers, setAnimatedNumbers] = useState<{[key: string]: number}>({});

  const pricingTiers: PricingTier[] = [
    {
      id: "monthly",
      name: "Starter",
      price: 100,
      period: "month",
      description: "Perfect for small businesses getting started",
      features: [
        "AI-powered document processing",
        "Up to 500 transactions/month",
        "SMS & WhatsApp receipts",
        "Basic analytics dashboard",
        "Email support",
        "Mobile app access"
      ],
      icon: <FaRocket />,
      color: "#22c55e"
    },
    {
      id: "quarterly",
      name: "Professional",
      price: 300,
      originalPrice: 300,
      period: "3 months",
      description: "Most popular choice for growing businesses",
      features: [
        "Everything in Starter",
        "Up to 2,000 transactions/month",
        "Advanced AI analytics",
        "Custom receipt templates",
        "Priority support",
        "API access",
        "Multi-user accounts",
        "Inventory management"
      ],
      popular: true,
      icon: <FaCrown />,
      color: "#22c55e"
    },
    {
      id: "biannual",
      name: "Business",
      price: 600,
      originalPrice: 800,
      period: "6 months",
      description: "Advanced features with 2 months free",
      features: [
        "Everything in Professional",
        "Up to 5,000 transactions/month",
        "Advanced reporting suite",
        "Custom integrations",
        "24/7 phone support",
        "White-label options",
        "Advanced security features",
        "Dedicated account manager"
      ],
      savings: "2 months free",
      icon: <MdAnalytics />,
      color: "#1f2973"
    },
    {
      id: "annual",
      name: "Enterprise",
      price: 1200,
      originalPrice: 1500,
      period: "12 months",
      description: "Complete solution with 3 months free",
      features: [
        "Everything in Business",
        "Unlimited transactions",
        "Custom AI model training",
        "Enterprise integrations",
        "On-site training",
        "Custom development",
        "SLA guarantees",
        "Compliance support"
      ],
      savings: "3 months free",
      icon: <FaStar />,
      color: "#1f2973"
    }
  ];

  useEffect(() => {
    // Animate numbers on mount
    pricingTiers.forEach(tier => {
      let current = 0;
      const target = tier.price;
      const increment = target / 30;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        setAnimatedNumbers(prev => ({
          ...prev,
          [tier.id]: Math.floor(current)
        }));
      }, 50);
    });
  }, []);

  const handleCheckout = (tierId: string, tierName: string) => {
    // Here you would integrate with your payment processor
    console.log(`Checkout for ${tierName} (${tierId})`);
    // For now, just show an alert
    alert(`Redirecting to checkout for ${tierName} plan...`);
  };

  return (
    <div className={PricingStyles.pricingSection}>
      {/* Background Effects */}
      <div className={PricingStyles.backgroundEffects}>
        <div className={PricingStyles.shape1}></div>
        <div className={PricingStyles.shape2}></div>
        <div className={PricingStyles.gradientOrb}></div>
      </div>

      <div className={PricingStyles.container}>
        {/* Header */}
        <div className={PricingStyles.header}>
          <div className={PricingStyles.badge}>
            <MdSpeed />
            Flexible Pricing
          </div>
          <h2 className={PricingStyles.title}>
            Choose Your <span className={PricingStyles.highlight}>Perfect Plan</span>
          </h2>
          <p className={PricingStyles.subtitle}>
            Scale your business with our AI-powered document processing solutions. 
            All plans include our core features with varying transaction limits.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className={PricingStyles.pricingGrid}>
          {pricingTiers.map((tier, index) => (
            <div
              key={tier.id}
              className={`${PricingStyles.pricingCard} ${
                tier.popular ? PricingStyles.popular : ""
              } ${selectedTier === tier.id ? PricingStyles.selected : ""}`}
              onClick={() => setSelectedTier(tier.id)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className={PricingStyles.popularBadge}>
                  <FaCrown />
                  Most Popular
                </div>
              )}

              {/* Savings Badge */}
              {tier.savings && (
                <div className={PricingStyles.savingsBadge}>
                  {tier.savings}
                </div>
              )}

              {/* Card Header */}
              <div className={PricingStyles.cardHeader}>
                <div 
                  className={PricingStyles.iconWrapper}
                  style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                >
                  {tier.icon}
                </div>
                <h3 className={PricingStyles.planName}>{tier.name}</h3>
                <p className={PricingStyles.planDescription}>{tier.description}</p>
              </div>

              {/* Pricing */}
              <div className={PricingStyles.pricing}>
                <div className={PricingStyles.priceWrapper}>
                  <span className={PricingStyles.currency}>P</span>
                  <span className={PricingStyles.price}>
                    {animatedNumbers[tier.id] || tier.price}
                  </span>
                  <span className={PricingStyles.period}>/{tier.period}</span>
                </div>
                {tier.originalPrice && tier.originalPrice > tier.price && (
                  <div className={PricingStyles.originalPrice}>
                    <span>P{tier.originalPrice}</span>
                    <span className={PricingStyles.savings}>
                      Save P{tier.originalPrice - tier.price}
                    </span>
                  </div>
                )}
              </div>

              {/* Features List */}
              <div className={PricingStyles.featuresList}>
                {tier.features.map((feature, featureIndex) => (
                  <div
                    key={featureIndex}
                    className={PricingStyles.feature}
                    style={{ animationDelay: `${(index * 0.1) + (featureIndex * 0.05)}s` }}
                  >
                    <div 
                      className={PricingStyles.checkIcon}
                      style={{ color: tier.color }}
                    >
                      <FaCheck />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                className={`${PricingStyles.ctaButton} ${
                  tier.popular ? PricingStyles.primaryButton : PricingStyles.secondaryButton
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckout(tier.id, tier.name);
                }}
                style={tier.popular ? { background: `linear-gradient(135deg, ${tier.color}, #16a34a)` } : {}}
              >
                <span>Get Started</span>
                <FaArrowRight className={PricingStyles.buttonArrow} />
              </button>

              {/* Card Footer */}
              <div className={PricingStyles.cardFooter}>
                <div className={PricingStyles.footerItem}>
                  <MdSecurity />
                  <span>Secure Payment</span>
                </div>
                <div className={PricingStyles.footerItem}>
                  <MdSupport />
                  <span>24/7 Support</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className={PricingStyles.bottomSection}>
          <div className={PricingStyles.guaranteeBox}>
            <div className={PricingStyles.guaranteeIcon}>
              <MdSecurity />
            </div>
            <div className={PricingStyles.guaranteeContent}>
              <h4>30-Day Money Back Guarantee</h4>
              <p>Try Aselar risk-free. If you're not satisfied, get a full refund within 30 days.</p>
            </div>
          </div>

          <div className={PricingStyles.contactBox}>
            <h4>Need a Custom Plan?</h4>
            <p>Contact our sales team for enterprise solutions and custom pricing.</p>
            <button className={PricingStyles.contactButton}>
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;