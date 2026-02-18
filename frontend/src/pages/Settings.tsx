import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { apiClient } from '../api/client';
import { toast } from '../utils/toast';
import type { Organization, Project, Site } from '../types';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'organizations' | 'projects' | 'sites'>('organizations');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showSiteForm, setShowSiteForm] = useState(false);

  const [orgForm, setOrgForm] = useState({ name: '', description: '' });
  const [projectForm, setProjectForm] = useState({ name: '', description: '', organization_id: '' });
  const [siteForm, setSiteForm] = useState({ name: '', description: '', project_id: '', location: '' });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'organizations') {
        const response = await apiClient.getOrganizations();
        setOrganizations(response.items);
      } else if (activeTab === 'projects') {
        const response = await apiClient.getProjects();
        setProjects(response.items);
        // Also load organizations for the form
        const orgsResponse = await apiClient.getOrganizations();
        setOrganizations(orgsResponse.items);
      } else if (activeTab === 'sites') {
        const response = await apiClient.getSites();
        setSites(response.items);
        // Also load projects for the form
        const projectsResponse = await apiClient.getProjects();
        setProjects(projectsResponse.items);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createOrganization(orgForm);
      toast.success('Organization created successfully');
      setShowOrgForm(false);
      setOrgForm({ name: '', description: '' });
      loadData();
    } catch (error) {
      console.error('Failed to create organization:', error);
      toast.error('Failed to create organization');
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createProject(projectForm);
      toast.success('Project created successfully');
      setShowProjectForm(false);
      setProjectForm({ name: '', description: '', organization_id: '' });
      loadData();
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
    }
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createSite({ ...siteForm, metadata: {} });
      toast.success('Site created successfully');
      setShowSiteForm(false);
      setSiteForm({ name: '', description: '', project_id: '', location: '' });
      loadData();
    } catch (error) {
      console.error('Failed to create site:', error);
      toast.error('Failed to create site');
    }
  };

  const tabs = [
    { id: 'organizations', label: 'Organizations' },
    { id: 'projects', label: 'Projects' },
    { id: 'sites', label: 'Sites' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Organizations Tab */}
        {activeTab === 'organizations' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Organizations</h2>
              <button
                onClick={() => setShowOrgForm(!showOrgForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {showOrgForm ? 'Cancel' : 'Add Organization'}
              </button>
            </div>

            {showOrgForm && (
              <form onSubmit={handleCreateOrganization} className="bg-white rounded-lg shadow p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={orgForm.name}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={orgForm.description}
                      onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Organization
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {organizations.map((org) => (
                    <tr key={org.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {org.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{org.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            org.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {org.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Projects</h2>
              <button
                onClick={() => setShowProjectForm(!showProjectForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {showProjectForm ? 'Cancel' : 'Add Project'}
              </button>
            </div>

            {showProjectForm && (
              <form onSubmit={handleCreateProject} className="bg-white rounded-lg shadow p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization *
                    </label>
                    <select
                      required
                      value={projectForm.organization_id}
                      onChange={(e) =>
                        setProjectForm({ ...projectForm, organization_id: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Organization</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={projectForm.description}
                      onChange={(e) =>
                        setProjectForm({ ...projectForm, description: e.target.value })
                      }
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {project.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{project.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            project.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {project.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sites Tab */}
        {activeTab === 'sites' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Sites</h2>
              <button
                onClick={() => setShowSiteForm(!showSiteForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {showSiteForm ? 'Cancel' : 'Add Site'}
              </button>
            </div>

            {showSiteForm && (
              <form onSubmit={handleCreateSite} className="bg-white rounded-lg shadow p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project *
                    </label>
                    <select
                      required
                      value={siteForm.project_id}
                      onChange={(e) => setSiteForm({ ...siteForm, project_id: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={siteForm.name}
                      onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={siteForm.location}
                      onChange={(e) => setSiteForm({ ...siteForm, location: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={siteForm.description}
                      onChange={(e) => setSiteForm({ ...siteForm, description: e.target.value })}
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Site
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sites.map((site) => (
                    <tr key={site.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {site.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {site.location}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{site.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            site.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {site.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
