import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="A scalable and robust service for managing and delivering push notifications across multiple channels">
      <HomepageHeader />
      <main>
        <div className="container padding-vert--xl">
          <div className="row">
            <div className="col col--8 col--offset-2">
              <h2>Why Push Notification Service?</h2>
              <p>
                The Push Notification Service provides a complete solution for delivering 
                real-time notifications to your users across multiple platforms. Built with 
                scalability and reliability in mind, it integrates with WebSockets, message 
                queues, and modern observability tools.
              </p>
              
              <h3>Key Features</h3>
              <ul>
                <li><strong>Real-time notifications</strong> - WebSocket support for instant delivery</li>
                <li><strong>Message queueing</strong> - RabbitMQ for reliable message delivery</li>
                <li><strong>Basic monitoring</strong> - Prometheus integration for system metrics</li>
                <li><strong>Centralized logging</strong> - Winston logger for aggregating logs</li>
                <li><strong>User management</strong> - Basic API for user management</li>
                <li><strong>Device management</strong> - Register/unregister devices for notifications</li>
              </ul>
              
              <h3>Getting Started</h3>
              <p>
                Ready to dive in? Check out our <Link to="/docs/">documentation</Link> to 
                learn how to set up and use the Push Notification Service.
              </p>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}